const express = require("express"),
  multer = require("multer");
const mongoose = require("mongoose");
require("dotenv").config();
const app = express();
const userRoutes = require("./Routes/user");
const auth = require("./middelware/auth");
const path = require("path");
const Port = 4000 || process.env.port;

// export models
const fileModel = require("./Models/UploadSchema");
const userModel = require("./Models/userModel");

//cors policy
const cors = require("cors");
app.use(
  cors({
    origin: "*",
    exposedHeaders: ["file-Type", "download-Id", "original-name"],
  })
);

//middelwares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//mongo connection
mongoose
  .connect(process.env.mongourl)
  .then((res) => {
    if (res) {
      app.listen(Port, () => {
        console.log(`connected with db and server is running on ${Port}`);
      });
    }
  })
  .catch((err) => {
    console.log("Connection Failed", err);
  });

//test route
app.get("/test", (req, res) => {
  res.header("file-Type", `ok`);
  return res.status(200).json({ ok: "ok" });
});

//multer for file upload
var Storage = multer.diskStorage({
  destination: "./uploadshort/",
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "_" + Date.now() + path.extname(file.originalname)
    );
  },
});
var file = (req, file, cb) => {
  const allowedMimeTypes = ["image/", "application/pdf", "video/"];

  if (allowedMimeTypes.some((type) => file.mimetype.startsWith(type))) {
    // console.log("file", file.originalname.size);
    cb(null, true);
  } else {
    cb("Please upload only images, PDFs, or videos.", false);
  }
};
var upload = multer({
  storage: Storage,
  fileFilter: file,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).single("file");

function isupload(req, res, next) {
  // Call the 'upload' function to handle the file upload
  upload(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          uploadStatus: "false",
          message: "File size exceeds the limit (10 MB)",
        });
      } else if (err === "Please upload only images, PDFs, or videos.") {
        return res.status(400).json({
          uploadStatus: "false",
          message: "Please upload only images, PDFs, or videos",
        });
      } else {
        return res
          .status(500)
          .json({ uploadStatus: "Something went wrong in uploading" });
      }
    }
    // Move on to the next middleware or route
    next();
  });
}
app.use("/user", userRoutes);

app.get("/user/files", auth, async (req, res) => {
  try {
    const userId = req.user;
    const list = await fileModel
      .find({
        owner: { $in: userId },
      })
      .select({ originalFileName: 1, shortUrl: 1, _id: 1 });
    return res
      .status(200)
      .json({ statusCode: 200, message: "list fetch sucessfully", list });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "something went wrong while fetching userlist ",
      error: `${error.message}`,
    });
  }
});

app.post("/upload", auth, isupload, async (req, res) => {
  try {
    const userId = req.user;
    const userDetails = await userModel.findById(userId);

    if (!userDetails) {
      return res.status(401).json({ statusCode: 401, message: "Unauthorized" });
    }
    if (req.file === undefined) {
      return res
        .status(400)
        .json({ statusCode: 400, message: "please upload file first" });
    }
    const { mimetype, filename, path, originalname } = req.file;

    const fileDetails = new fileModel({
      fileName: filename,
      type: mimetype,
      path: path,
      originalFileName: originalname,
      owner: req.user,
    });

    const shortUrl = `${process.env.frontendUrl}/${fileDetails._id}`;
    fileDetails.shortUrl = shortUrl;
    const saveData = await fileDetails.save();
    return res.status(200).json({
      shortUrl: saveData.shortUrl,
      file: {
        _id: saveData._id,
        originalFileName: saveData.originalFileName,
        shortUrl: saveData.shortUrl,
      },
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "failed to uplaod file on server ",
      error: `${error.message}`,
    });
  }
});

app.get("/file/:fileId", auth, async (req, res) => {
  try {
    const userId = req.user;
    const userDetails = await userModel.findById(userId);

    if (!userDetails) {
      return res.status(401).json({ statusCode: 401, message: "Unauthorized" });
    }

    const { fileId } = req.params;
    console.log(fileId);
    const filedata = await fileModel.findById(fileId);
    if (!filedata) {
      return res
        .status(400)
        .json({ statusCode: 400, message: "file doesn't exist" });
    }
    console.log(filedata);
    const path = `${__dirname}/${filedata.path}`;
    res.header("file-Type", `${filedata.type}`);
    res.header("original-name", `${filedata.originalFileName}`);

    return res.status(200).sendFile(path); //file visible
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "something went wrong try again ",
      error: `${error.message}`,
    });
  }
});

app.delete("/user/file", auth, async (req, res) => {
  try {
    const { fileId } = req.body;
    const userId = req.user;
    const fileDetail = await fileModel.findOne({ _id: fileId });
    console.log(fileDetail);
    if (!fileDetail) {
      return res
        .status(400)
        .json({ statusCode: 400, message: "file not exist" });
    }

    if (userId === fileDetail.owner) {
      const deleteFile = await fileModel.deleteOne({ _id: fileId });
      return res.status(200).json({
        statusCode: 200,
        success: true,
        message: "file delete successfully",
      });
    }

    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: "only owner can delete the file",
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "something went wrong try again later",
      error: `${error.message}`,
    });
  }
});
