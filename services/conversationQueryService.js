const {sql} = require('../config/db')

async function getUserConversations(userId) {
    const request = new sql.Request()

    request.input('USERID', sql.Int, userId)

    const result = await request.query(`
        SELECT C.MACUOC, C.MAGT, C.MADH, C.TRANGTHAI, C.HOATDONGCUOI,
                GT.TENGT, HA.DUONGDAN AS ANHDAIDIEN,
        CASE WHEN C.NGUOI1 = @USERID THEN TK2.MATK
             ELSE TK1.MATK
        END AS MATKDOITAC,
        
        CASE WHEN C.NGUOI1 = @USERID THEN TK2.TENTK
             ELSE TK1.TENTK
        END AS TENTKDOITAC,
        
        LASTMSG.NOIDUNG, LASTMSG.LOAITINNHAN, LASTMSG.THOIGIAN AS THOIGIANTINNHANCUOI,
        ISNULL(UNREAD.SOLUONGCHUADOC, 0) AS SOLUONGCHUADOC
        
        FROM CUOCTROCHUYEN C
        
        INNER JOIN GIAOTRINH GT ON GT.MAGT = C.MAGT
        INNER JOIN TAIKHOAN TK1 ON TK1.MATK = C.NGUOI1
        INNER JOIN TAIKHOAN TK2 ON TK2.MATK = C.NGUOI2

        OUTER APPLY
        (
            SELECT TOP (1) H.DUONGDAN
            FROM HINHANHGIAOTRINH H
            WHERE H.MAGT = C.MAGT
            ORDER BY H.THUTU ASC
        ) HA
        
        OUTER APPLY 
        (
            SELECT TOP (1) TN.NOIDUNG, TN.LOAITINNHAN, TN.THOIGIAN
            FROM TINNHAN TN
            WHERE TN.MACUOC = C.MACUOC
                AND TN.DAXOA = 0
            ORDER BY TN.THOIGIAN DESC
        ) LASTMSG
         
        OUTER APPLY
        (
            SELECT COUNT(*) AS SOLUONGCHUADOC
            FROM TINNHAN TN
            WHERE TN.MACUOC = C.MACUOC
                AND TN.NGUOINHAN = @USERID
                AND TN.DADOC = 0
                AND TN.DAXOA = 0
        )UNREAD
        
        WHERE C.NGUOI1 = @USERID
            OR C.NGUOI2 = @USERID
        ORDER BY C.HOATDONGCUOI DESC`)

    return result.recordset
}


module.exports  = {getUserConversations}