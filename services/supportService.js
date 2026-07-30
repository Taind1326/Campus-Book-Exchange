const {sql} = require('../config/db')


async function insertSupport(transaction, data, nguoiGui) {
    const request = new sql.Request(transaction)

    request.input('NGUOIGUI', sql.Int, nguoiGui)
    request.input('LOAIPHANHOI', sql.NVarChar(50), data.loaiPhanHoi)
    request.input('TIEUDE', sql.NVarChar(200), data.tieuDe)
    request.input('NOIDUNG', sql.NVarChar(2000), data.noiDung)

    const result = await request.query(`
        INSERT INTO PHANHOIHOTRO (NGUOIGUI, LOAIPHANHOI, TIEUDE, NOIDUNG)
        OUTPUT INSERTED.MAPHANHOI, INSERTED.NGUOIGUI, INSERTED.LOAIPHANHOI, INSERTED.TIEUDE,
                INSERTED.NOIDUNG, INSERTED.MUCDOUUTIEN, INSERTED.TRANGTHAI, INSERTED.NGAYGUI, INSERTED.NGAYCAPNHAT
        VALUES (@NGUOIGUI, @LOAIPHANHOI, @TIEUDE, @NOIDUNG)`)

    return result.recordset[0]
}


async function insertSupportImages(transaction, maPhanHoi, images) {
    for (const image of images) {
        const request = new sql.Request(transaction)

        request.input('MAPHANHOI', sql.BigInt, maPhanHoi)
        request.input('DUONGDAN', sql.NVarChar(500), image.DUONGDAN)
        request.input('PUBLIC_ID', sql.NVarChar(300), image.PUBLIC_ID)
        request.input('THUTU', sql.Int, image.THUTU)

        await request.query(`
            INSERT INTO HINHANHPHANHOI (MAPHANHOI, DUONGDAN, PUBLIC_ID, THUTU)
            VALUES (@MAPHANHOI, @DUONGDAN, @PUBLIC_ID, @THUTU)`)
    }
}


async function getMySupports(nguoiGui, page, limit) {
    const request = new sql.Request()
    const offset = (page - 1) * limit

    request.input('NGUOIGUI', sql.Int, nguoiGui)
    request.input('OFFSET', sql.Int, offset)
    request.input('LIMIT', sql.Int, limit)

    const result = await request.query(`
        SELECT PH.MAPHANHOI, PH.LOAIPHANHOI, PH.TIEUDE, PH.MUCDOUUTIEN, PH.TRANGTHAI, PH.NGAYGUI,
                PH.NGAYCAPNHAT, PH.NGAYXULY,

            (
                SELECT COUNT(*)
                FROM HINHANHPHANHOI HA
                WHERE HA.MAPHANHOI = PH.MAPHANHOI
            ) AS SOLUONGHINH,

            (
                SELECT TOP 1 HA.DUONGDAN
                FROM HINHANHPHANHOI HA
                WHERE HA.MAPHANHOI = PH.MAPHANHOI
                ORDER BY HA.THUTU ASC
            ) AS ANHDAIDIEN,

            COUNT(*) OVER() AS TONGSO

        FROM PHANHOIHOTRO PH

        WHERE PH.NGUOIGUI = @NGUOIGUI

        ORDER BY
            PH.NGAYCAPNHAT DESC,
            PH.MAPHANHOI DESC

        OFFSET @OFFSET ROWS
        FETCH NEXT @LIMIT ROWS ONLY`)

    const totalItems = result.recordset.length > 0 ? Number(result.recordset[0].TONGSO) : 0
    const items = result.recordset.map(
        support => {
            const {
                TONGSO,
                ...supportData
            } = support

            return {
                ...supportData,
                SOLUONGHINH:
                    Number(
                        supportData.SOLUONGHINH
                    )
            }
        }
    )

    return {
        items,
        page,
        limit,
        totalItems,
        totalPages:
            Math.ceil(totalItems / limit)
    }
}


async function getMySupportDetail(maPhanHoi, nguoiGui) {
    const request = new sql.Request()

    request.input('MAPHANHOI', sql.BigInt, maPhanHoi)
    request.input('NGUOIGUI', sql.Int, nguoiGui)

    const result = await request.query(`
        SELECT MAPHANHOI, NGUOIGUI, LOAIPHANHOI, TIEUDE, NOIDUNG, MUCDOUUTIEN, TRANGTHAI,
                CAUTRALOI, NGAYGUI, NGAYCAPNHAT, NGAYXULY
        FROM PHANHOIHOTRO
        WHERE MAPHANHOI = @MAPHANHOI
            AND NGUOIGUI = @NGUOIGUI;

        SELECT HA.MAHINH, HA.MAPHANHOI, HA.DUONGDAN, HA.THUTU, HA.NGAYTAO
        FROM HINHANHPHANHOI HA
        JOIN PHANHOIHOTRO PH ON PH.MAPHANHOI = HA.MAPHANHOI
        WHERE HA.MAPHANHOI = @MAPHANHOI
            AND PH.NGUOIGUI = @NGUOIGUI
        ORDER BY HA.THUTU ASC;`)

    const support = result.recordsets[0][0]

    if (!support) {
        const error = new Error('Không tìm thấy phản hồi hoặc bạn không có quyền xem!')
        error.status = 404
        throw error
    }

    return {
        ...support,
        HINHANH: result.recordsets[1]
    }
}


async function getSupportForCancellationWithLock(transaction, maPhanHoi) {
    const request = new sql.Request(transaction)

    request.input('MAPHANHOI', sql.BigInt, maPhanHoi)

    const result = await request.query(`
        SELECT MAPHANHOI, NGUOIGUI, TRANGTHAI
        FROM PHANHOIHOTRO WITH (UPDLOCK, HOLDLOCK)
        WHERE MAPHANHOI = @MAPHANHOI`)

    if (result.recordset.length === 0) {
        const error = new Error('Không tìm thấy phản hồi!')
        error.status = 404
        throw error
    }

    return result.recordset[0]
}


function validateSupportCancellation(support, nguoiGui) {
    if (support.NGUOIGUI !== nguoiGui) {
        const error = new Error('Bạn không có quyền hủy phản hồi này!')
        error.status = 403
        throw error
    }

    if (support.TRANGTHAI !== 'Mới') {
        const error = new Error('Chỉ phản hồi mới gửi mới có thể hủy!')
        error.status = 409
        throw error
    }
}


async function cancelSupport(transaction, maPhanHoi, nguoiGui) {
    const request = new sql.Request(transaction)

    request.input('MAPHANHOI', sql.BigInt, maPhanHoi)
    request.input('NGUOIGUI', sql.Int, nguoiGui)

    const result = await request.query(`
        UPDATE PHANHOIHOTRO
        SET TRANGTHAI = N'Đã hủy',
            NGAYCAPNHAT = SYSDATETIME()
        OUTPUT INSERTED.MAPHANHOI,INSERTED.NGUOIGUI, INSERTED.TRANGTHAI, INSERTED.NGAYCAPNHAT
        WHERE MAPHANHOI = @MAPHANHOI
            AND NGUOIGUI = @NGUOIGUI
            AND TRANGTHAI = N'Mới'`)

    if (result.recordset.length === 0) {
        const error = new Error('Phản hồi đã được xử lý trước đó!')
        error.status = 409
        throw error
    }

    return result.recordset[0]
}


module.exports = {
    insertSupport,
    insertSupportImages,
    getMySupports,
    getMySupportDetail,
    getSupportForCancellationWithLock,
    validateSupportCancellation,
    cancelSupport
}