const jwt = require("jsonwebtoken");

const SECRET_KEY = "sparta-secret-key";

const { Op } = require("sequelize");
const { User_token } = require("../models");


module.exports = async (req, res, next) => {
    const accessToken = req.cookies.accessToken;   
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) return res.status(400).json({ success: false, errorMessage: "Refresh Token이 존재하지 않습니다." });
    if (!accessToken) return res.status(400).json({ success: false, errorMessage: "Access Token이 존재하지 않습니다." });

    const isAccessTokenValidate = validateAccessToken(accessToken);
    const isRefreshTokenValidate = validateRefreshToken(refreshToken);

    if (isRefreshTokenValidate === false) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return res.status(412).json({ success: false, errorMessage: "Refresh Token이 만료되었습니다." });
    }

    const token_record = await User_token.findOne({where: {token: refreshToken}})

    if (isAccessTokenValidate === false) {
        if (token_record === null || token_record === undefined) {
            return res.status(400).json({success:false, 
                errorMessage: "Refresh Token의 정보가 서버에 존재하지 않습니다."})
        }
        const newAccessToken = jwt.sign({userId: token_record.userId, email: token_record.email}
            , SECRET_KEY, { expiresIn: '60s' })
        res.cookie('accessToken', newAccessToken);
        res.locals.userId = token_record.userId;
        res.locals.nickname = token_record.nickname;
        return next();
    }
    res.locals.userId = token_record.userId;
    res.locals.nickname = token_record.nickname;
    next();
}

// Access Token을 검증.
function validateAccessToken(accessToken) {
    try {
        jwt.verify(accessToken, SECRET_KEY); 
              // JWT를 검증한다. 단순히 에러가 터지냐 안터지냐 체크만 할 거라서 따로 결과값을 변수에 담거나 하진 않는다.
              // 해당 키로 만든 토큰이 아니거나, 유효 기간이 만료되었을 경우 에러가 발생.
        return true;
    } catch (error) {
        return false;
    }
}
  
// Refresh Token을 검증.
function validateRefreshToken(refreshToken) {
    try {
        jwt.verify(refreshToken, SECRET_KEY); 
        return true;
    } catch (error) {
        return false;
    }
}