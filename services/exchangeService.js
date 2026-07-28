    const {sql} = require('../config/db')


    function validateExchangeInput(textbook, data) {
        const coBaiMangDoi = data.maGTMangDoi !== null && data.maGTMangDoi !== undefined
        const coSoLuongMangDoi = data.soLuongMangDoi !== null && data.soLuongMangDoi !== undefined

        if (textbook.LOAI === 'Trao đổi') {
            if (!coBaiMangDoi || !coSoLuongMangDoi) {
                const error = new Error('Giao dịch trao đổi bắt buộc phải chọn giáo trình mang đổi!')
                error.status = 400
                throw error
            }

            return
        }

        if (coBaiMangDoi || coSoLuongMangDoi) {
            const error = new Error('Chỉ bài đăng trao đổi mới được cung cấp giáo trình mang đổi!')
            error.status = 400
            throw error
        }
    }


    async function getExchangeTextbookWithLock(transaction, maGTMangDoi) {
        const request = new sql.Request(transaction)

        request.input('MAGTMANGDOI', sql.Int, maGTMangDoi)

        const result = await request.query(`
            SELECT GT.MAGT, GT.TENGT, GT.NGUOIDANG, GT.SOLUONG, GT.SOLUONGDANGGIU, GT.LOAI, GT.TRANGTHAI,
                (
                    SELECT COUNT(*)
                    FROM HINHANHGIAOTRINH HA
                    WHERE HA.MAGT = GT.MAGT
                ) AS SOLUONGHINH

            FROM GIAOTRINH GT WITH (UPDLOCK, HOLDLOCK)
            WHERE GT.MAGT = @MAGTMANGDOI`)

        if (result.recordset.length === 0) {
            const error = new Error('Không tìm thấy giáo trình mang đổi!')
            error.status = 404
            throw error
        }

        return result.recordset[0]
    }



    function validateExchangeTextbook(targetTextbook, exchangeTextbook, nguoiMua, data) {
        if (exchangeTextbook.NGUOIDANG !== nguoiMua) {
            const error = new Error('Giáo trình mang đổi không thuộc tài khoản của bạn!')
            error.status = 403
            throw error
        }

        if (exchangeTextbook.MAGT === targetTextbook.MAGT) {
            const error = new Error('Giáo trình mang đổi phải khác giáo trình muốn nhận!')
            error.status = 400
            throw error
        }

        if (exchangeTextbook.LOAI !== 'Trao đổi') {
            const error = new Error('Bài mang đổi phải có loại Trao đổi!')
            error.status = 409
            throw error
        }

        if (exchangeTextbook.TRANGTHAI !== 'Đang hiển thị') {
            const error = new Error('Giáo trình mang đổi hiện không thể giao dịch!')
            error.status = 409
            throw error
        }

        if (Number(targetTextbook.SOLUONGHINH) <= 0) {
            const error = new Error('Giáo trình muốn nhận phải có ít nhất một hình ảnh!')
            error.status = 409
            throw error
        }

        if (Number(exchangeTextbook.SOLUONGHINH) <= 0) {
            const error = new Error('Giáo trình mang đổi phải có ít nhất một hình ảnh!')
            error.status = 409
            throw error
        }

        const soLuongDangGiu = exchangeTextbook.SOLUONGDANGGIU ?? 0
        const soLuongConLai = exchangeTextbook.SOLUONG - soLuongDangGiu

        if (data.soLuongMangDoi > soLuongConLai) {
            const error = new Error(`Giáo trình mang đổi chỉ còn ${soLuongConLai} cuốn khả dụng!`)
            error.status = 409
            throw error
        }
    }



    async function insertExchangeProposal(transaction, maDH, targetTextbook, data) {
        const request = new sql.Request(transaction)

        request.input('MADH', sql.Int, maDH)
        request.input('MAGTDUOCDOI', sql.Int, targetTextbook.MAGT)
        request.input('MAGTMANGDOI', sql.Int, data.maGTMangDoi)
        request.input('SOLUONGMANGDOI', sql.Int, data.soLuongMangDoi)

        const result = await request.query(`
            INSERT INTO DEXUATTRAODOI (MADH, MAGTDUOCDOI, MAGTMANGDOI, SOLUONGMANGDOI)
            OUTPUT INSERTED.MADH, INSERTED.MAGTDUOCDOI, INSERTED.MAGTMANGDOI, INSERTED.SOLUONGMANGDOI
            VALUES (@MADH, @MAGTDUOCDOI, @MAGTMANGDOI, @SOLUONGMANGDOI)`)

        return result.recordset[0]
    }



    async function getExchangeProposalForOrderWithLock(transaction, maDH) {
        const request = new sql.Request(transaction)

        request.input('MADH', sql.Int, maDH)

        const result = await request.query(`
            SELECT DH.MADH, DH.LOAIGIAODICH, DX.MAGTDUOCDOI, DX.MAGTMANGDOI, DX.SOLUONGMANGDOI
            FROM DONHANG DH WITH (UPDLOCK, HOLDLOCK)
            LEFT JOIN DEXUATTRAODOI DX WITH (UPDLOCK, HOLDLOCK)
                ON DX.MADH = DH.MADH
            WHERE DH.MADH = @MADH`)

        if (result.recordset.length === 0) {
            const error = new Error('Không tìm thấy đơn hàng!')
            error.status = 404
            throw error
        }

        const proposal = result.recordset[0]

        if (proposal.LOAIGIAODICH !== 'Trao đổi') {
            return null
        }

        if (!proposal.MAGTDUOCDOI || !proposal.MAGTMANGDOI || !proposal.SOLUONGMANGDOI) {
            const error = new Error('Dữ liệu đề xuất trao đổi của đơn hàng không hợp lệ!')
            error.status = 409
            throw error
        }

        return proposal
    }


    async function getExchangeTextbooksForConfirmationWithLock(transaction, proposal) {
        const request = new sql.Request(transaction)

        request.input('MAGTDUOCDOI', sql.Int, proposal.MAGTDUOCDOI)
        request.input('MAGTMANGDOI', sql.Int, proposal.MAGTMANGDOI)

        const result = await request.query(`
            SELECT MAGT, TENGT, NGUOIDANG, SOLUONG, SOLUONGDANGGIU, LOAI, TRANGTHAI
            FROM GIAOTRINH WITH (UPDLOCK, HOLDLOCK)
            WHERE MAGT IN (
                @MAGTDUOCDOI,
                @MAGTMANGDOI
            )
            ORDER BY MAGT ASC`)

        if (result.recordset.length !== 2) {
            const error = new Error('Không tìm thấy đầy đủ hai giáo trình trao đổi!')
            error.status = 409
            throw error
        }

        const targetTextbook = result.recordset.find(
            textbook => textbook.MAGT === proposal.MAGTDUOCDOI
        )

        const exchangeTextbook = result.recordset.find(
            textbook => textbook.MAGT === proposal.MAGTMANGDOI
        )

        if (!targetTextbook || !exchangeTextbook) {
            const error = new Error('Dữ liệu giáo trình trao đổi không hợp lệ!')
            error.status = 409
            throw error
        }

        return {
            targetTextbook,
            exchangeTextbook
        }
    }



    function validateExchangeConfirmation(order, proposal, textbooks) {
        const {
            targetTextbook,
            exchangeTextbook
        } = textbooks

        if (proposal.MAGTDUOCDOI !== order.MAGT) {
            const error = new Error('Giáo trình được đổi không khớp với đơn hàng!')
            error.status = 409
            throw error
        }

        if (targetTextbook.NGUOIDANG !== order.NGUOIBAN) {
            const error = new Error('Giáo trình muốn nhận không còn thuộc người bán!')
            error.status = 409
            throw error
        }

        if (exchangeTextbook.NGUOIDANG !== order.NGUOIMUA) {
            const error = new Error('Giáo trình mang đổi không còn thuộc người mua!')
            error.status = 409
            throw error
        }

        if (targetTextbook.LOAI !== 'Trao đổi' || exchangeTextbook.LOAI !== 'Trao đổi') {
            const error = new Error('Hai bài đăng phải có loại Trao đổi!')
            error.status = 409
            throw error
        }

        if (targetTextbook.TRANGTHAI !== 'Đang hiển thị' || exchangeTextbook.TRANGTHAI !== 'Đang hiển thị') {
            const error = new Error('Một trong hai giáo trình hiện không thể trao đổi!')
            error.status = 409
            throw error
        }

        const soLuongConLaiBaiNhan = targetTextbook.SOLUONG - (targetTextbook.SOLUONGDANGGIU ?? 0)

        const soLuongConLaiBaiMangDoi = exchangeTextbook.SOLUONG - (exchangeTextbook.SOLUONGDANGGIU ?? 0)

        if (order.SOLUONG > soLuongConLaiBaiNhan) {
            const error = new Error('Giáo trình muốn nhận không còn đủ số lượng!')
            error.status = 409
            throw error
        }

        if (proposal.SOLUONGMANGDOI > soLuongConLaiBaiMangDoi) {
            const error = new Error('Giáo trình mang đổi không còn đủ số lượng!')
            error.status = 409
            throw error
        }
    }



    async function holdExchangeTextbookQuantity(transaction, proposal) {
        const request = new sql.Request(transaction)

        request.input('MAGTMANGDOI', sql.Int, proposal.MAGTMANGDOI)
        request.input('SOLUONGMANGDOI', sql.Int, proposal.SOLUONGMANGDOI)

        const result = await request.query(`
            UPDATE GIAOTRINH
            SET SOLUONGDANGGIU = SOLUONGDANGGIU + @SOLUONGMANGDOI,
                TRANGTHAI = CASE WHEN SOLUONG - (SOLUONGDANGGIU + @SOLUONGMANGDOI) <= 0
                        THEN N'Đang giao dịch' ELSE N'Đang hiển thị'
                    END,

                NGAYCAPNHAT = SYSDATETIME()

            WHERE MAGT = @MAGTMANGDOI
            AND LOAI = N'Trao đổi'
            AND TRANGTHAI = N'Đang hiển thị'
            AND SOLUONG - SOLUONGDANGGIU
                    >= @SOLUONGMANGDOI`)

        if (result.rowsAffected[0] !== 1) {
            const error = new Error('Không thể giữ số lượng giáo trình mang đổi!')
            error.status = 409
            throw error
        }
    }


    async function releaseExchangeTextbookQuantity(transaction, proposal, orderStatus) {
        if (orderStatus === 'Đang trao đổi') {
            return 0
        }

        const request = new sql.Request(transaction)

        request.input('MAGTMANGDOI', sql.Int, proposal.MAGTMANGDOI)
        request.input('SOLUONGMANGDOI', sql.Int, proposal.SOLUONGMANGDOI)

        const result = await request.query(`
            UPDATE GIAOTRINH
            SET SOLUONGDANGGIU = SOLUONGDANGGIU - @SOLUONGMANGDOI,
                TRANGTHAI = CASE
                    WHEN TRANGTHAI IN (
                        N'Tạm ẩn',
                        N'Đã xóa'
                    )
                    THEN TRANGTHAI

                    WHEN SOLUONG = 0
                    THEN N'Hết hàng'

                    WHEN SOLUONG -
                        (
                            SOLUONGDANGGIU -
                            @SOLUONGMANGDOI
                        ) > 0
                    THEN N'Đang hiển thị' ELSE N'Đang giao dịch'
                END,

                NGAYCAPNHAT = SYSDATETIME()

            WHERE MAGT = @MAGTMANGDOI
            AND LOAI = N'Trao đổi'
            AND SOLUONGDANGGIU >= @SOLUONGMANGDOI`)

        if (result.rowsAffected[0] !== 1) {
            const error = new Error('Dữ liệu số lượng đang giữ của giáo trình mang đổi không hợp lệ!')
            error.status = 409
            throw error
        }

        return proposal.SOLUONGMANGDOI
    }


    module.exports = {
        validateExchangeInput,
        getExchangeTextbookWithLock,
        validateExchangeTextbook,
        insertExchangeProposal,
        getExchangeProposalForOrderWithLock,
        getExchangeTextbooksForConfirmationWithLock,
        validateExchangeConfirmation,
        holdExchangeTextbookQuantity,
        releaseExchangeTextbookQuantity
    }