const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    require: true,
  },
  path: {
    type: String,
    require: true,
  },
  shortUrl: {
    type: String,
    require: true,
  },
  originalFileName: {
    type: String,
    require: true,
  },
  owner: {
    type: String,
    require: true,
  },
});

module.exports = mongoose.model("file", fileSchema);
