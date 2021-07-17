const { ServiceBroker } = require("moleculer");
const HTTPServer = require("moleculer-web");
//const axios = require('axios');
const request = require('request');
const async = require('async');
const mongoose = require("mongoose");
const URL =  require("./schemas/url");
mongoose.connect('mongodb://localhost:27017/dyte', {useNewUrlParser: true, useUnifiedTopology: true});

const db = mongoose.connection;
db.on('error', console.error.bind(console, '[ERROR] Unable to connect to MongoDB'));
db.once('open', () => {
  console.log("Coonection established with MongoDB")
});

const microservicesBroker = new ServiceBroker({
  nodeID: "microservice-node-1",
  transporter: null
});

microservicesBroker.createService({
  name: "webhooks",
  mixins: [HTTPServer],
  settings: {
    port: process.env.PORT || 4000,
    routes: [
      {
        aliases: {
          "GET /register": "webhooks.register",
          "GET /update"  : "webhooks.update",
          "GET /list"    : "webhooks.list",   
          "GET /trigger" : "webhooks.trigger"
        }
      }
    ]
  },
 
  actions:{
            register(ctx){
            let id ="";
            let entry =  new URL({targetUrl : "https://jsonplaceholder.typicode.com/posts"});
            id = entry.save()
            .then( (url) => {
              id = url._id;
              console.log("ID for URL: " + id)
              return id.toString();
            })
            .catch(err => handleError(err));
            return  id;
            },

            async update(ctx){
              try{
              await URL.updateOne({_id : "60f1d3d8e90c783d1ccebd40"}, { targetUrl: "www.youtube.com" });
              return "URL updated";
              }
              catch(err){
                return "Error invalid ID"
              }
            },

            async list(ctx){
                let docs = await URL.find({});
                let vals = [];
                docs.forEach( (obj) => {
                  vals.push({ "id" : obj._id, "targetUrl" : obj.targetUrl})
                })
                return ({list : vals});
            },

            async trigger(ctx){
              try {
              let docs = await URL.find({});
              
              let vals = [];
              docs.forEach( (obj) => {

                vals.push(obj.targetUrl)
              })
              let count =0;
              let c
              while(vals.length !== 0)
              {
                let sp = vals.splice(0,3);
                async.map(sp, function(link,callback) { 
                    request({
                      url: link,
                      method: "POST",
                      headers: {
                          "Content-Type": "application/json"
                      },
                      json: { 
                        ipAddress: "192.168.1.1"
                      }
                    },(err,res,data) => {if(res.statusCode == 201) count = count+1})
                  },function(err,res,data) {
                  count = count + 1
                  console.log(count)
                    });

                // axios.post(url,{ip: "192.168.1.1"},{headers:{ 'Content-Type' : 'application/json'}})
                //   .then( response => {
                //     callback(response)
                //   })
                //   .catch(err => console.log(err));

                // }
                // ], function(response){
                //   console.log(response.status)
                // });
              
            }
             return count;
            }

              catch(err){
                return console.log(err);
              }
              
            }
  }
 

});


Promise.all([microservicesBroker.start()]);