/* This file contains the server side code */

var express = require('express'),
	//app variable bundles together all the requirements to create a server
	app = express(), 
	//manually creating server as socket.io needs a http server object
	server = require('http').createServer(app),
	//socket.io requires a https object
	io = require('socket.io').listen(server),	 
	mongoose = require('mongoose'),
	// array to store the list of users currently connected to the chat app
	nicknames=[];

//server listens on port 3000
server.listen(3000); 

//connecting to mongoose database
mongoose.connect('mongodb://localhost/chat', function(err){
	if(err)
	{
		console.log(err);
	}
	else{
		console.log('Connected to mongodb');
	}
});

//creating a Schema
var chatSchema = mongoose.Schema({
	nameInList: String,
	msg: String,
	created: {type: Date, default: Date.now}
});

//creating a Model with Colllection name and Schema name
var Chat = mongoose.model('Message', chatSchema);

//sending client index.html 
app.get('/',function(req,res) {
	res.sendFile(__dirname + '/index.html');
});

//turning on the connection to the socket
io.sockets.on('connection', function(socket){
	// finding ols msgs to load
	Chat.find({}, function(err,docs){
		if(err) throw err;
		console.log('sending msgs');
		// emitting old msgs
		socket.emit('loading msgs', docs);
	});

	// adding a new user
	socket.on('new user', function(data, callback){
		//ensuring username is not already taken
		if(nicknames.indexOf(data)!= -1)
		{
			callback(false);
		}
		else{
			callback(true);
			socket.nickname = data;
			nicknames.push(socket.nickname);
			updateNames();
		}
	});

	// emit the usernames list
	function updateNames(){
		io.sockets.emit('usernames',nicknames);
	}

	// saving sent msgs in database
	socket.on('send message',function(data){
		var newMsg = new Chat({msg:data, nameInList: socket.nickname});
		newMsg.save(function(err){
			if(err) throw err;
			// emiting the msgs to be displayed on client side	
			io.sockets.emit('new message', {msg: data, nameInList: socket.nickname});
		});
	});

	// disconnecting 
	socket.on('disconnect', function(data){
		// if a username doesnot exist, do nothing
		if(!socket.nickname) return;
		// if username exists, remove it
		nicknames.splice(nicknames.indexOf(socket.nickname),1);
		//emit the list of users
		updateNames();
	});

});
