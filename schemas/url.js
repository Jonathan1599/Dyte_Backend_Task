const mongoose = require('mongoose');
const Schema = mongoose.Schema

const URLSchema = new Schema({
    targetUrl: {
        type: String,
        requried: true
    }
   
})

const URLs = mongoose.model('URL', URLSchema)
module.exports = URLs;
