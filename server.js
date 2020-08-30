'use strict';

const bodyParser = require('body-parser');
const dotenv = require('dotenv').config();
const express = require('express');
const mongo = require('mongodb');
const mongoose = require('mongoose');
const dns = require('dns');

const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

/** this project needs a db !! **/
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json())
app.use(cors());

//TODO : A real error handling using middleware
const handleError = (err) => {
  console.log(err);
}

const urlSchema = mongoose.Schema({
  'original_url': {
    type: String,
    required: true
  },
  'short_url': {
    type: Number,
    required: true
  }
});
const ShortUrl = mongoose.model('shortUrl', urlSchema);


let createAndSaveShortUrl = (original_url, short_url, done) => {
  let doc = new ShortUrl({
    original_url,
    short_url
  })
  doc.save((err, data) => {
    if (err) return done(err)
    done(null, data);
  })
};

const findLastShortUrlId = (done) => {
  ShortUrl.findOne()
      .sort({_id: -1})
      .select('short_url')
      .exec((err, data) => {
        if (err) return done(err);
        done(null, data)
      });
};

const findOneByShortUrl = (short_url, done) => {
  short_url = Number.parseInt(short_url);
  ShortUrl.findOne({short_url}).select('original_url').exec((err, data) => {
    if (err) return done(err)
    return done(null, data);
  });
};

app.post("/api/shorturl/new", (req, res) => {
  let original_url = new URL(req.body.url);
  dns.lookup(original_url.host, ((err, address) => {
    if (err) return res.send({"error": "invalid URL"})
    findLastShortUrlId((err, data) => {
      if (err) return handleError(err);
      if (!data) {
        createAndSaveShortUrl(original_url, 1, (err, data) => {
          if (err) handleError(err);
          return res.json({original_url: data.original_url, short_url: data.short_url})
        })
      } else {
        createAndSaveShortUrl(original_url, Number.parseInt(data.short_url) + 1, (err, data) => {
          if (err) handleError(err);
          return res.json({original_url: data.original_url, short_url: data.short_url})
        })
      }
    });
  }))
});

app.get('/api/shorturl/:short_url', (req, res) => {
  findOneByShortUrl(req.params.short_url, (err, data) => {
    if (err) return handleError(err);
    if (data && data.original_url) return res.redirect(data.original_url);
    res.redirect('/')
  });
});

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});


// your first API endpoint...
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});
