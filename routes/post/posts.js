const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth-middleware.js")

const { Op } = require("sequelize");
const { User, Post, Comment, User_post_like } = require("../../models");



// 경로 : localhost:8000/posts          포스트 리스트
router.get("/", async (req, res) => {
    const getPosts = await Post.findAll({});
    const result = getPosts.map((post) => {
        return {
            postId: post["postId"],
            userId: post["userId"],
            nickname: post["nickname"],
            title: post["title"],
            content: post["content"],
            likes: post["likes"],
            createdAt: post["createdAt"]
        }
    })

    res.status(200).json({PostsList: result});
})

// 경로 : localhost:8000/posts      포스트 등록
router.post("/", authMiddleware, async (req, res) => {
    const {title, content} = req.body;
    const userId = res.locals.userId;
    const nickname = res.locals.nickname;

    console.log("userId : " + userId)
    console.log("nickname : " + nickname)
    const existUser = await User.findOne({ where: { [Op.and]: [{ userId }, { nickname }] } })

    if (!existUser) {
        return res.status(412).json({succecc: false, errorMessage: "존재하지 않는 계정으로 포스팅을 시도하셨습니다."})
    }

    if (!userId || !nickname || !title || !content) {  
        return res.status(412).json({success: false, message:"데이터 형식이 올바르지 않습니다."})
    }

    try {
        const createdPost = await Post.create({userId, nickname, title, content});
        return res.status(200).json({success: true, message:"게시글 등록이 완료되었습니다."})
    } catch(err) {
        return res.status(400).json({success: false, errorMessage: "게시글 등록이 실패하였습니다."})
    }
})


/* -------------------------- 게시글 상세 조회, 수정, 삭제 -------------------------- */

// 미들 웨어. postId params 를 잘못 입력 받은 경우.
router.use("/:postId", (req, res, next) => {
    const postId = Number(req.params["postId"]);   // Number() 를 사용했는데 문자열이 숫자가 아닌 글자다? NaN 반환. 
    if (Number.isNaN(postId)) {
        return res.status(412).send({success: false, message:"데이터 형식이 올바르지 않습니다."});
    }
    return next();
})

// 경로 : localhost:8000/posts/:postId          포스트 상세 조회
router.get("/:postId", async (req, res) => {
    const { postId } = req.params;
    const getPost = await Post.findOne({ where: { postId } });
    const getComments = await Comment.findAll({ where: {postId} });
    const data = {}

    if (getPost === null || getPost === undefined) {
        return res.status(412).json({success: false, errorMessage: "존재하지 않는 게시글 입니다."})
    } else {
        data["post"] = getPost;
    }

    if (getComments.length >= 1) {
        data["comments"] = getComments;
    }

    res.status(200).json({success: true, data: data});
})

// 경로 : localhost:8000/posts/:postId          포스트 수정
router.put("/:postId", authMiddleware, async (req, res) => {
    const { postId } = req.params;
    const { title, content } = req.body;
    const getPost = await Post.findOne({ where: {postId}});

    if (!title || !content) {
        return res.status(412).json({success: false, message:"데이터 형식이 올바르지 않습니다."})
    }

    if (!getPost) {
        return res.status(400).json({success: false, errorMessage: "존재하지 않는 게시글 입니다."})
    }

    await Post.update({title, content}, {where: {postId}});
    res.status(200).json({success: true, message: "게시글이 성공적으로 수정되었습니다."});
})

// 경로 : localhost:8000/posts/:postId          포스트 삭제
router.delete("/:postId", authMiddleware, async (req, res) => {
    const {postId} = req.params;
    const getPost = await Post.findOne({ where: {postId}});

    if (!getPost) {
        return res.status(400).json({success: false, errorMessage: "존재하지 않는 게시글 입니다."})
    }

    await Post.destroy({ where: {postId} })
    res.status(200).json({success: true, message:"게시글을 성공적으로 삭제하였습니다."})
})




/* -------------------------- 게시글 좋아요 -------------------------- */

// 경로 : localhost:8000/posts/:postId/like         좋아요 클릭 시
router.get("/:postId/like", authMiddleware, async (req, res) => {
    const {postId} = req.params;
    const userId = res.locals.userId;
    const getPost = await Post.findOne({where: {postId}});  // {} 혹은 null

    if (!getPost) {
        return res.status(404).json({success: false, errorMessage: "존재하지 않는 게시글 입니다."})
    }

    const existLike = await User_post_like.findOne({where: { [Op.and]: [{ userId }, { postId }] }})

    if (!existLike) {   // 좋아요 장착
        await User_post_like.create({userId, postId});
        await Post.increment({likes: 1}, {where: {postId}});
            /*
            UPDATE `Posts` SET `likes`=`likes`+ 1,`updatedAt`='2022-12-21 00:16:37' 
                WHERE `postId` = '1'
            */
        return res.status(200).json({success: true, message:"좋아요!"})
    } else {    // 좋아요 해제
        await User_post_like.destroy({ where: {[Op.and]: [{ userId }, { postId }]} })
        await Post.increment({likes: -1}, {where: {postId}});
            /* 
            UPDATE `Posts` SET `likes`=`likes`+ -1,`updatedAt`='2022-12-21 00:15:48' 
                WHERE `postId` = '1'
            */
            return res.status(200).json({success: true, message:"좋아요 해제!"})
    }

})



module.exports = router;