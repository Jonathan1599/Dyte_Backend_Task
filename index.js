const { ServiceBroker } = require("moleculer");
const HTTPServer = require("moleculer-web");
//const axios = require('axios');
const express = require("express");
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

//Express app settings and routes
const app = express();
app.use(express.json())
const port = 3000;
app.get('/list',(req,res,next) =>{
   microservicesBroker.call("webhooks.list",null,)
   .then(resp => res.send(resp))
   .catch(err => res.send(err));

})
.get('/register',(req,res,next) =>{
  microservicesBroker.call("webhooks.register",{ targetUrl: req.body.targetUrl})
  .then(resp => res.send("ID received for "+ req.body.targetUrl + " is " + resp))
  .catch(err => res.send(err));
})
.get('/update',(req,res) =>{
  microservicesBroker.call("webhooks.update",{id : req.body.id, newTargetUrl : req.body.newTargetUrl})
  .then( resp => res.send("id:" + req.body.id+ " set to " + req.body.newTargetUrl + " successfully " ))
  .catch(err => res.send(err));
})
.get('/ip', (req, res) =>{
  microservicesBroker.call("webhooks.trigger",{ip : req.ip})
  .then( () =>  res.send("All webhooks triggered") )
  .catch( (err) => res.send(err));
})
.get('/delete', (req, res) =>{
  microservicesBroker.call("webhooks.delete", {id : req.body.id})
  .then( (url) => {
    if(url != undefined)
    res.send(req.body.id + " deleted successfully") ;
    else
    res.send("Invalid id")
    }) 

  .catch( (err) => {
    res.send(err)});
})
app.listen(port, () => {
  console.log(`Webhooks Microservices app listening at http://localhost:${port}`)
})

// microservice settings and functionalities
microservicesBroker.createService({
  name: "webhooks",
  actions:{
            register(ctx){
            let id ="";
            let entry =  new URL({targetUrl : ctx.params.targetUrl});
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
              await URL.updateOne({_id : ctx.params.id}, { targetUrl: ctx.params.newTargetUrl });
              return "URL updated";
              }
              catch(err){
                return "Error invalid ID"
              }
            },

            async list(ctx){
                let docs = await URL.find({});
                let urls = [];
                docs.forEach( (obj) => {
                  urls.push({ "id" : obj._id, "targetUrl" : obj.targetUrl})
                })
                return ({list : urls});
            },

            async delete(ctx)
            {
                let entry
                let check = await  URL.find({_id : ctx.params.id}) ;
                if(check.length == 0)
                    return null;
                URL.findByIdAndDelete({_id: ctx.params.id})
                .then( (doc) => {
                  entry = doc.targetUrl;
            })
                .catch( err =>  err);
                console.log(entry)
                return ctx.params.id;
            },

            async trigger(ctx){
              try {
              let docs = await URL.find({});
              
              let urls = [];
              docs.forEach( (obj) => {

                urls.push(obj.targetUrl)
              })
              let count =0;
              let c
              while(urls.length !== 0)
              {
                let sp = urls.splice(0,10);
                async.map(sp, function(link,callback) { 
                  if(link.includes("http://") == false && link.includes("https://") == false)
                    link  = "https://"  + link
                    request({
                      url: link,
                      method: "POST",
                      headers: {
                          "Content-Type": "application/json"
                      },
                      json: { 
                        ipAddress: ctx.ip
                      }
                    },(err,res,data,ext) => { callback(null,"done")})
                  },function(err,res,data) {
                   console.log(res)
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