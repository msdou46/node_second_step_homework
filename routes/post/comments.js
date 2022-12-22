const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth-middleware.js")

const { Op } = require("sequelize");
const { Post, Comment } = require("../../models");


// 경로 : localhost:8000/posts/:postId/comments         게시글에 댓글 작성.
router.post("/:postId/comments", authMiddleware, async (req, res) => {
    const {postId} = req.params;
    const {content} = req.body;
    const userId = res.locals.userId;
    const nickname = res.locals.nickname;
    
    if (!content) {
        return res.status(412).json({succecc: false, errorMessage: "댓글을 입력해 주세요."})
    }

    const getPost = await Post.findOne({where: {postId}})
    if (getPost === null || getPost === undefined) {
        return res.status(412).json({succecc: false, errorMessage: "존재하지 않는 게시글 입니다."})
    }

    try {
        await Comment.create({userId, postId, nickname, content});
        return res.status(200).json({success: true, message:"댓글 등록이 완료되었습니다."})
    } catch(error) {
        return res.status(400).json({success: false, message:"댓글 등록이 실패하였습니다."})
    }
})


// 미들 웨어. params 를 잘못 입력 받은 경우.
router.use("/:postId/comments/:commentId", (req, res, next) => {
    const postId = Number(req.params["postId"]);   // Number() 를 사용했는데 문자열이 숫자가 아닌 글자다? NaN 반환. 
    const commentId = Number(req.paramsp["commentId"]);
    if (Number.isNaN(postId) || Number.isNaN(commentId)) {
        return res.status(412).send({success: false, message:"데이터 형식이 올바르지 않습니다."});
    }
    return next();
})


// 경로 : localhost:8000/posts/:postId/comments/:commentId          댓글 수정
router.put('/:postId/comments/:commentId', authMiddleware, async (req, res) => {
    const {postId, commentId} = req.params;
    const {content} = req.body;

    if (!content) {
        return res.status(412).json({succecc: false, errorMessage: "수정할 내용을 입력해 주세요"})
    }

    const existComment = await Comment.findOne({ where: { [Op.and]: [{ postId }, { commentId }] } })
    if (!existComment) {
        return res.status(412).json({succecc: false, errorMessage: "해당 댓글은 존재하지 않습니다."})
    }

    await Comment.update({content}, {where: {commentId}});
    res.status(200).json({success: true, message: "댓글을 성공적으로 수정하였습니다."})
})

// 경로 : localhost:8000/posts/:postId/comments/:commentId      댓글 삭제
router.delete("/:postId/comments/:commentId", authMiddleware, async (req, res) => {
    const {postId, commentId} = req.params;
    const existComment = await Comment.findOne({ where : { [Op.and]: [{ postId }, { commentId }] }})

    if (!existComment) {
        return res.status(412).json({success: false, errorMessage:"해당 댓글은 존재하지 않습니다."})
    }

    await Comment.destroy({ where: {commentId} })
    res.status(200).json({success: true, message: "댓글을 성공적으로 삭제하였습니다."})

})





module.exports = router;