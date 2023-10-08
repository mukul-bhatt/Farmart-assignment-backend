const jwt = require("jsonwebtoken");

const requireAuth = async (req, res, next) => {
  // verify authentication
  const { authorization } = req.headers;
  console.log("🔥  file: auth.js:6  authorization: ", authorization);

  if (!authorization) {
    return res.status(401).json({ error: "authorization token required" });
  }
  // this authorization is a string like
  // 'Bearer ergsf234vfbedf.weredv34rtcv.3243rteg4wrv3' i.e 'Bearer (token)'
  const token = authorization.split(" ")[1];
  try {
    const { _id } = jwt.verify(token, process.env.SECRET);
    req.user = _id;
    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({ error: "request is not authorized" });
  }
};

module.exports = requireAuth;
