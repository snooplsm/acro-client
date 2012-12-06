var rooms = null;
var username = getCookie('username');
var player_id = getCookie('player_id');
var room_id;
var room;
var round;
var answers;
var answerHtmls = {};
var roundTime;
var roundTimer;
var votingRoundTimer;
var socket;
var selectedAnswer;
var faceoffStart;
var canVote;

function setCookie(c_name,value,exdays)
{
var exdate=new Date();
exdate.setDate(exdate.getDate() + exdays);
var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
document.cookie=c_name + "=" + c_value;
}

function getCookie(c_name)
{
var i,x,y,ARRcookies=document.cookie.split(";");
for (i=0;i<ARRcookies.length;i++)
{
  x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
  y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
  x=x.replace(/^\s+|\s+$/g,"");
  if (x==c_name)
    {
    return unescape(y);
    }
  }
}

function GUID() {
	var S4 = function() {
			return Math.floor(
			Math.random() * 0x10000 /* 65536 */ ).toString(16);
		};

	return (
	S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
};

function connect() {
	var host = "ws://ryangravener.com:8081/websocket";
	try {
		socket = new WebSocket(host);
		message('<p class="event">Socket Status: ' + socket.readyState);
		if(player_id==null) {
			player_id = GUID();
		}
		setCookie("player_id",player_id,200);
		socket.onopen = function() {
			if(username==null) {
				requestUsername();
			} else {
				requestRooms();
			}
			
		}
		socket.onmessage = function(msg) {
			console.log(msg.data);
			handleMessage(JSON.parse(msg.data));
		}
		socket.onclose = function() {
			message('<p class="event">Socket Status: ' + socket.readyState + ' (Closed)');
		}
	} catch (exception) {
		alert(exception);
		message('<p>Error' + exception);
	}
};

function send() {
	var text = $('#text').val();
	if (text == "") {
		message('<p class="warning">Please enter a message');
		return;
	}
	try {
		socket.send(text);
		message('<p class="event">Sent: ' + text)
	} catch (exception) {
		message('<p class="warning">');
	}
	$('#text').val("");
}

function requestRooms() {
	console.log("requestRooms");
	socket.send(JSON.stringify({
		type: "rl"
	}));
}

function onRoomClick(event) {
	var id = $(this).attr('id');
	if(username==null) {
		requestUsername();
	} else {
		joinRoom(id);
	}
}

function requestUsername() {
	$("round").addClass('gone');
	$("#login").removeClass('gone');
}

function onAnswerClick(event) {
	if(!canVote) {
		return;
	}
	if(selectedAnswer) {
		selectedAnswer.removeClass('answer_selected');
	}
	selectedAnswer = $(this);
	var id = $(this).attr('id');
	if(id!=player_id) {
		selectedAnswer.addClass('answer_selected')
		voteAnswer(id);
	}
}

function onAnswerPress(event) {
	if (event.which == 13) {
		sendAcronym($(this).attr('value'));
	}
}

function onUsernamePress(event) {
	if(event.which==13) {
		var val = $(this).val().trim();
		if(val!=null) {
			if(val.length>0 && val.length<15) {
				username = val;
				onUsername(username);
			} else {
				alert("Username must be > 1 < 15 length");
			}
		}
	}
}

function onUsername(data) {
	alert('on ' + data);
	requestRooms();
}

function sendAcronym(acro) {
	socket.send(JSON.stringify({
		type: "aa",
		username: username,
		user_id: player_id,
		room: room.id,
		acronym: acro
	}));
}

function joinRoom(roomId) {
	socket.send(JSON.stringify({
		type: "jr",
		username: username,
		avatar_url: "http://ryangravener.com/40x40.png",
		user_id: player_id,
		room: roomId
	}));
}

function voteAnswer(answerId) {
	socket.send(JSON.stringify({
		type: "vt",
		username: username,
		user_id: player_id,
		room: room.id,
		acronym: answerId
	}));
}

function handleMessage(msg) {
	var type = msg.type;
	var data = msg.data;
	if("m"==type) {
		handleChatMessage(data);
	}
	if ("rl" == type) {
		handleRoomList(data);
	}
	if ("jr" == type) {
		handleJoinedRoom(data);
	}
	if ("nu" == type) {
		handleNewUser(data);
	}
	if ("sr" == type) {
		handleRound(data);
	}
	if ("lv" == type) {
		handleUserLeave(data);
	}
	if ("as" == type) {
		handleAnswersReceived(data);
	}
	if("fas"==type) {
		handleAnswersReceived(data);
	}
	if ("vc" == type) {
		handleVoteCountReceived(data);
	}
	if("fo"==type) {
		handleFaceoffRound(data);
	}
	if("for"==type) {
		handleFaceoffLosers(data);
	}
	if("go"==type) {
		handleGameOver(data);
	}
}

function handleChatMessage(data) {
	var line = $("<line/>");
	var message = $("<message/>");
	message.addClass('new_user');
	//message.text(data.username + " joined the room.");
	var username = $("<username/>");
	username.text(data.username);
	line.append(username);
	line.append(message);
	$("chat lines").append(line);
}

function handleGameOver(data) {
	showWinners(data);
	round = null;
}

function handleAnswersReceived(data) {
	answers = data;
	showAnswers(data);
	canVote = true;
}

function handleVoteCountReceived(data) {
	canVote = false;
	answers = data;
	showVoteCount(data);
	updateUserScores(data);
}

function updateUserScores(data) {
	console.log('updateuserscores');
	for(answerIndex in data.answers) {
		var answer = data.answers[answerIndex];
		console.log(answer);
		var playerId = answer.player.user_id;
		var player = room.players[playerId];
		if(player!=null) {
//			console.log('updating player total from ' + player.total_vote_coun);
			player.total_vote_count = answer.player.total_vote_count;
		}
	}
	showUsers(room.players);
}

function showVoteCount(data) {
	console.log("showVoteCount");
	$('#round').hide();
	//$('#answers').empty();
	for (key in data.answers) {
		var answer = data.answers[key];
		var p = answerHtmls[answer.player.user_id];
		//p.attr('id',answer.player.user_id);
		if(p == null) {
			var p = $("<p/>");
			$('#answers').append(p);
			answerHtmls[answer.player.user_id] = p;
		}
		p.text(answer.player.username + " (" + answer.vote_count.toString() + ")" + " " + answer.text);
		if(answer.player.user_id==player_id) {
			p.addClass('my_answer');
		}
		p.addClass('answer_results');
		//$('#answers').append(p);
	}
	answerTime = 10;
	$('#votingRoundTime').text(answerTime + "");
	votingRoundTimer = setInterval(function() {
		answerTime -= 1;
		$('#votingRoundTime').text(answerTime + "");
		if (answerTime == 0) {
			clearInterval(votingRoundTimer);
		}
	}, 1000);
	
	$('#answers').show();
}

function showAnswers(data) {
	$('#round').hide();
	$('#answers p').empty();
	for (key in answerHtmls) {
		delete answerHtmls[key];
	}
	for (key in data.answers) {
		var answer = data.answers[key];
		var p = $("<p/>");
		p.attr('id', answer.player.user_id);
		p.text((parseInt(key) + 1) + ". " + answer.text);
		$('#answers').append(p);
		answerHtmls[answer.player.user_id] = p;
		if(answer.player.user_id==player_id) {
			p.addClass('my_answer');
		}
	}
	answerTime = room.vote_time;
	$('#votingRoundTime').text(answerTime + "");
	votingRoundTimer = setInterval(function() {
		answerTime -= 1;
		$('#votingRoundTime').text(answerTime + "");
		if (answerTime == 0) {
			clearInterval(votingRoundTimer);
		}
	}, 1000);
	
	$('#answers').show();
}

function handleFaceoffRound(data) {
	round = data;
	showRound(data);
}

function handleFaceoffLosers(data) {
	faceoffStart = data;
}

function handleRound(data) {
	round = data;
	showRound(data);
	playRound(data);
}

function playRound(data) {
	$("#round_music").play();
}

function handleRoomList(data) {
	rooms = data;
	//showRooms(rooms);
//	alert('handle roomlist');
	if(username!=null) {
		joinLargestRoom(data);
	} else {
		requestUsername();
	}
}

function joinLargestRoom(data) {
	var maxRoom;
	for(var key in data) {
		var room = data[key];
		if(maxRoom==null) {
			maxRoom = room;
		}
		if(room.player_count>maxRoom.player_count && room.player_count < 15) {
			maxRoom = room;
		}
	}
	//alert(JSON.stringify(maxRoom));
	joinRoom(maxRoom.id);
	
}

function handleNewUser(data) {
	room.players[data.user_id] = data;
	showUsers(room.players);
	notifyNewUser(data);
}

function notifyNewUser(data) {
	var line = $("<line/>");
	var message = $("<message/>");
	message.addClass('new_user');
	message.text(data.username + " joined the room.");
	line.append(message);
	$("chat lines").append(line);
}

function handleUserLeave(data) {
	delete room.players[data];
	showUsers(room.players);
	notifyUserLeft(data);
}

function notifyUserLeft(data) {
	var line = $("<line/>");
	var message = $("<message/>");
	message.addClass('user_left');
	message.text(data.username + " left the room.");
	line.append(message);
	$("chat lines").append(line);
}

function handleJoinedRoom(data) {
	room = data;
	hideRooms();
	showRoom(room);
	showUsers(room.players)
}

function hideRooms() {
	$("round").addClass('gone');
}

function showRoom(room) {
	$('round').addClass('gone');
	$('#waiting').removeClass('gone');
}

function showWinners(data) {
	$("#main_header div").hide();
	var h3 = $("#gameover h3");
	if(data.isTie) {
		h3.text('Draw');
	} else {
		h3.text(room.players[data.winner_user_id].username);
	}
	$("#gameover").show();
}

function showRooms(rooms) {
	$('#rooms p').empty();
	for (var key in rooms) {
		var room = rooms[key];
		$('#rooms').append("<p id='" + room.id + "'>" + room.name + " (" + room.player_count + ")</p>");
	}
}

function showRound(round) {
	$("round").addClass('gone');
	$('#waiting').removeClass('gone');
	$('#answers').hide();
	$('#acronym').empty();
	$('#round p').empty();
	$('#answer').show();
	$('#roundTime').show();
	$('#acronym').show();
	$('#gameover').hide();
	$('#acronym').append("<p id='" + round.round + "'>" + round.acronym + "</p>")
	$('#category').text(round.category);
	$('#round').show();
	$('#answer input').val('').focus();
	if (roundTimer != null) {
		$("#round_music").stop();
		clearInterval(roundTimer);
	}
	roundTime = room.answer_time;
	$('#roundTime').text(roundTime + "");
	roundTimer = setInterval(function() {
		roundTime -= 1;
		$('#roundTime').text(roundTime + "");
		if (roundTime == 0) {
			clearInterval(roundTimer);
		}
	}, 1000);
}

function showUsers(users) {
	$('#users p').empty();
	for (var key in users) {
		var user = users[key];
		$('#users').append("<p id='" + key + "'>" + user.username + " (" + user.total_vote_count +") </p>");
	}
	$('#users').show();

}

function message(msg) {
	$('#chatLog').append(msg + '</p>');
}

$(document).ready(function() {
	$("#welcome")[0].play();
	if (!("WebSocket" in window)) {
		alert('no websocket?');
		$('#chatLog, input, button, #examples').fadeOut("fast");
		$('<p>Oh no, you need a browser that supports WebSockets. How about <a href="http://www.google.com/chrome">Google Chrome</a>?</p>').appendTo('#container');
	} else {
		//The user has WebSockets
		connect();
		$('#text').keypress(function(event) {
			if (event.keyCode == '13') {
				send();
			}
		});
		$('#disconnect').click(function() {
			socket.close();
		});
		$('#rooms p').live('click', onRoomClick);
		$('#answers p').live('click', onAnswerClick);
		$('inputcont input').live('keypress', onUsernamePress);
		$('#answer input').live('keypress', onAnswerPress);
	} //End connect
});
