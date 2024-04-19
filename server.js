import express from 'express';
import vite from 'vite-express';
import {Server} from 'socket.io';

import database from './database.js';
//import path from 'path';

//console.log('path: '+path.resolve())

const
  app = express(),
  port = 3000;

app.use(express.json());

const server = vite.listen(app, process.env.PORT || port)

const io = new Server(server);

const rooms = {};

function randomAnswer(){
  return Math.floor(Math.random()*24);
}

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect',()=>{
    //TODO: Handle disconnect
    //socket.rooms.forEach will iterate through rooms they've joined
    console.log("user disconnected");
  });
  socket.on('chat message',(msg)=>{
    console.log("Message: " + msg);
    socket.emit('host failed','room full');
  });
  socket.on('host game',(room)=>{
    room = room.toLowerCase();
    if(room in rooms){
      if(rooms[room].connected_players.length >= 2){
        socket.emit('host failed','room full');
      }else{
        socket.emit('host failed','room in use');
      }
    }else{
      //TODO: Use the DB and populate the list
      rooms[room] = {
        roomCode:room,
        type:"pokemon",
        board:[],
        chat:[
          
        ],
        answer_p1:randomAnswer(),
        answer_p2:randomAnswer(),
        flipped_p1:[],
        flipped_p2:[],
        guessed_p1:[],
        guessed_p2:[],
        //This is in milliseconds, not seconds.
        started:new Date().getTime(),
        connected_players:["Player 1"]
      };
      console.log(rooms[room].answer_p1);
      console.log(rooms[room].answer_p2);
      socket.join(room);
      socket.emit('host success',room,"Player 1");
      io.to(room).emit('message receive',"Server","Player 1 joined");
    }
  });
  
  socket.on('join game',(room)=>{
    room = room.toLowerCase();
    if(room in rooms){
      if(rooms[room].connected_players.length >= 2){
        socket.emit('join failed','room full');
      }else{
        rooms[room].connected_players.push("Player 2");
        socket.join(room);
        socket.emit('join success',room,"Player 2");
        io.to(room).emit('message receive',"Server","Player 2 joined");
      }
    }else{
      socket.emit('join failed','room not found');
    }
  });
  socket.on('chat message',(room,name,msg)=>{
    io.to(room).emit('message receive',name,msg);
  });
  socket.on('guess',(room,name,index,cardName)=>{
    //TODO: Prevent click if there are <2 players connected.
    if(rooms[room].connected_players.length == 2){
      io.to(room).emit('message receive',"Server",name + " guessed "+ cardName);
      let answer;
      let winner;
      if(rooms[room].connected_players[0] == name){
        //p1
        answer = rooms[room].answer_p2;
        winner = rooms[room].connected_players[0];
      }else{
        //p2
        answer = rooms[room].answer_p1;
        winner = rooms[room].connected_players[1];
      }
      console.log("Guess: " + index + ", Answer: " + answer);
      if(index==answer){
        // io.to(room).emit('game end',winner,room.board[index].name,room.board[index].url);
        //TODO: uncomment above line once we're properly using the DB.
        io.to(room).emit('game end',winner,"Caterpie","https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/full/800.png");
      }
    }
  });
  socket.on('flip',(room,name,index,cardName)=>{
    //TODO: Add to flipped obj
    //TODO: Change to send server message function
    io.to(room).emit('message receive',"Server",name + " flipped " + cardName);
  });
});


database.set_up_db_store(app)