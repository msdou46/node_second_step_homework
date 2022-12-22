const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const util = require("util");

const SECRET_KEY = "sparta-secret-key";

const { Op } = require("sequelize");
const { User, User_token } = require("../../models");
const { nextTick } = require("process");



// 경로 : localhost:8000/users/signup        회원가입
router.post("/signup", async (req, res) => {
    const {email, nickname, confirmPassword} = req.body;
    let { password } = req.body;
    const only_en_or_num = /^[A-Za-z0-9]+$/;
    const check_nickname = only_en_or_num.test(nickname)

    if (!check_nickname || nickname.length < 3) {
        return res.status(412).json({success: false, errorMessage: "닉네임의 형식이 알맞지 않습니다."})
    }
    if (password !== confirmPassword) {
        return res.status(412).json({success: false, errorMessage: "비밀번호가 일치하지 않습니다."})
    }
    if (password.length < 4 || password.includes(nickname)) {
        return res.status(412).json({success: false, errorMessage: "비밀번호의 형식이 알맞지 않습니다."})
    }

    const user_nickname = await User.findAll({ where: { nickname } })   // 없으면 [] 있으면 [{}]
    const user_email = await User.findAll({ where: { email } })

    if (user_nickname.length >= 1) {
        return res.status(412).json({success: false, errorMessage: "이미 존재하는 닉네임 입니다."})
    }
    if (user_email.length >= 1) {
        return res.status(412).json({success: false, errorMessage: "이미 존재하는 이메일 입니다."})
    }

    try {
        const randomBytesPromise = util.promisify(crypto.randomBytes);
        const pbkdf2Promise = util.promisify(crypto.pbkdf2);
        const buf = await randomBytesPromise(64);
        const salt = buf.toString("base64");
        const hashedPassword = await pbkdf2Promise(password, salt, 100000, 64, "sha512");
        password = hashedPassword.toString("base64")

        await User.create({email, nickname, password, salt})        

    } catch (err) {
        console.log("회원가입 도중 에러 발생. " + err)
    }

    res.json({success: true, message: "회원가입에 성공하였습니다."})
})


// 미들 웨어. 로그인 url 접속 전에, 해당 유저가 로그인 상태인지 아닌지 검사.
router.use("/auth", async (req, res, next) => {   
    const refreshToken = req.cookies.refreshToken; 
    let isRefreshTokenValidate = false;
    let token_record = false; 

    if (refreshToken) {
        isRefreshTokenValidate = validateRefreshToken(refreshToken);
    } else {
        return next();
    }

    if (isRefreshTokenValidate) {
        token_record = await User_token.findOne({where: {token: refreshToken}})
    } else {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return res.status(400).json({success: false, errorMessage:"로그인 기한이 만료되었습니다."})
    }

    if (token_record) {
        return res.json({message: "이미 로그인 중!"})
    }

    return next();    
})


// 경로 : localhost:8000/users/auth             로그인
router.post("/auth", async (req, res) => {
    const {email, password} = req.body;
    const user_by_e = await User.findOne({ where: { email } });     // 있으면 {}, 없으면 null

    if (!user_by_e) {     
        return res.status(412).json({success: false, errorMessage: "존재하지 않는 user 정보 입니다."})  
    }

    const pbkdf2Promise = util.promisify(crypto.pbkdf2);
    const hashedPassword = await pbkdf2Promise(password, user_by_e.salt, 100000, 64, "sha512");
    const encodedHashedPassword = hashedPassword.toString("base64")
    
    if (encodedHashedPassword !== user_by_e.password) {
        return res.status(412).json({success: false, errorMessage: "비밀번호가 올바르지 않습니다."}) 
    }

    const accessToken = jwt.sign({userId: user_by_e.userId, email: email}
        , SECRET_KEY, { expiresIn: '60s' })
    const refreshToken = jwt.sign({}, SECRET_KEY, { expiresIn: '1d' })
    
    res.cookie('accessToken', accessToken); 
    res.cookie('refreshToken', refreshToken);

    const existToken = await User_token.findOne({where: {userId: user_by_e.userId}})  // 없으면 null

    if (existToken) {
        console.log("기존의 토큰이 있음!!!")
        await User_token.update({token: refreshToken}, {where: {userId: user_by_e.userId}})
    } 
    if (!existToken) {
        console.log("기존의 토큰이 없음!!!")
        await User_token.create({userId : user_by_e.userId, nickname:user_by_e.nickname, 
            email: email, token: refreshToken})
    }

    return res.status(200).json({success: true, message: "로그인 성공!"})
})




// Refresh Token을 검증.
function validateRefreshToken(refreshToken) {
    try {
        jwt.verify(refreshToken, SECRET_KEY); 
        return true;
    } catch (error) {
        return false;
    }
}


module.exports = router;
