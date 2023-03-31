const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
require("dotenv").config();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static("public"));

let listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

let uri = process.env.MONGO_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let exSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String,
});

let userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  log: [exSchema],
  count: { type: Number },
});

let User = mongoose.model("User", userSchema);
let Exercise = mongoose.model("Exercise", exSchema);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async (req, res) => {
  const { username } = req.body;
  let user = await User.findOne({ username: req.body.username });
  if (!user) {
    user = new User({ username: username });
    await user.save();

    res.status(200).json(user);
  } else {
    res.status(400).send("This user already exists.");
  }
});

app.get("/api/users", (req, res) => {
  User.find()
    .then((result) => res.status(200).json(result))
    .catch((error) => res.status(400).send(error));
});

const getDate = (date) => {
  if (!date) {
    return new Date().toDateString();
  }
  const correctDate = new Date();
  const dateString = date.split("-");
  correctDate.setFullYear(dateString[0]);
  correctDate.setDate(dateString[2]);
  correctDate.setMonth(dateString[1] - 1);

  return correctDate.toDateString();
};

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { description, duration, date } = req.body;

  let exercise = new Exercise({
    description: description,
    duration: duration,
    date: getDate(date),
  });

  await exercise.save();

  User.findByIdAndUpdate(
    req.params._id,
    { $push: { log: exercise } },
    { new: true }
  )
    .then((result) => {
      let resObj = {};
      resObj["_id"] = result._id;
      resObj["username"] = result.username;
      resObj["date"] = exercise.date;
      resObj["duration"] = exercise.duration;
      resObj["description"] = exercise.description;

      res.json(resObj);
    })
    .catch((error) => res.status(400).send(error));
});

app.get("/api/users/:_id/logs", (req, res) => {
  User.findById(req.params._id).then((result) => {
    let resObj = result;

    if (req.query.from || req.query.to) {
      let fromDate = new Date(0);
      let toDate = new Date();

      if (req.query.from) {
        fromDate = new Date(req.query.from);
      }

      if (req.query.to) {
        toDate = new Date(req.query.to);
      }

      fromDate = fromDate.getTime();
      toDate = toDate.getTime();

      resObj.log = resObj.log.filter((session) => {
        let sessionDate = new Date(session.date).getTime();
        return sessionDate >= fromDate && sessionDate <= toDate;
      });
    }
    if (req.query.limit) {
      resObj.log = resObj.log.slice(0, req.query.limit);
    }
    resObj["count"] = result.log.length;
    res.json(resObj);
  });
});
