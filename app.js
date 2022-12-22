const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();
const port = 8000;

// routes 가져오기
const usersRouter = require("./routes/user/auth.js")
const postsRouter = require("./routes/post/posts.js")
const commentsRouter = require("./routes/post/comments.js")

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

app.use("/users", usersRouter);
app.use("/posts", [postsRouter, commentsRouter]);


app.get('/', (req, res) => {
    res.send("Hello World! I'm 노드4기");
});

app.listen(port, () => {
    console.log(port, port + ' 포트로 서버가 열렸어요!');
  })