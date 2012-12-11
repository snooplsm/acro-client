var rooms = null;
var username; 
var player_id;
var room_id;
var room;
var round;
var answers;
var answerHtmls = {};
var winnerHtml,bonusHtml;
var winnerPointsHtml, bonusPointsHtml;
var winnerVotersHtml = [];
var winnerVotersPointsHtml = [];
var roundTime;
var roundTimer;
var votingRoundTimer;
var socket;
var selectedAnswer;
var faceoff;
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
			player_id = getCookie("player_id");
			if(player_id==null) {
				player_id = GUID();
			}
		}
		setCookie("player_id",player_id,200);
		if(username==null) {
			username = getCookie("username");
		}
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
	$("inputcont input").focus();
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
		$("answer received").text(roundTime).removeClass('hide');
	}
}

function onChatPress(event) {
	if(event.which==13) {
		sendMessage($(this).attr('value'));
		$(this).attr('value','');
	}
}

function sendMessage(text) {
	socket.send(JSON.stringify({
		type: "m",
		username: username,
		user_id: player_id,
		room: room.id,
		message: text
	}));
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
	setCookie("username",data,200);
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
		handleFaceoffAnswersReceived(data);
	}
	if("fvc"==type) {
		handleFaceoffVoteCountReceived(data);
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
	message.text(data.message);
	line.append(username);
	line.append(message);
	$("chat lines").append(line);
}

function handleGameOver(data) {
	showWinners(data);
	round = null;
}

function handleFaceoffAnswersReceived(data) {
	answers = data;
	showFaceoffAnswers(data);
	canVote = true;
}

function handleAnswersReceived(data) {
	answers = data;
	showAnswers(data);
	canVote = true;
}

function handleFaceoffVoteCountReceived(data) {
	canVote = false;
	answers = data;
	showFaceoffAnswers(data,true);
	updateFaceoffScores(data);
}
function handleVoteCountReceived(data) {
	canVote = false;
	answers = data;
	showAnswers(data,true);
	updateUserScores(data);
}

function updateUserScores(data) {
	console.log('updateuserscores');
	for(answerIndex in data.answers) {
		var answer = data.answers[answerIndex];
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

function showFaceoffAnswers(data,results) {
	$("round").addClass("gone");
	$("#faceoff_round").removeClass('gone');
	for(key in data.answers) {
		var answer = data.answers[key];
		var p = $("faceoffanswers").find("#"+answer.player.user_id);
		var user = p.find("username");
		var score = p.find("score");
		var acroanswer = p.find("faceoffacroanswer");
		acroanswer.text(answer.text);
		if(results) {
			score.text(answer.vote_count);
			score.removeClass('hide');
			username.removeClass("hide");
			username.text(answer.player.username);
		}
	}

}

function showAnswers(data,results) {
	$("round").addClass('gone');
	$("#vote_answers").removeClass("gone");
	console.log(!results);
	if(!results) {
		$("round answers").empty();
		for (key in answerHtmls) {
			delete answerHtmls[key];
		}
	}
	for (key in data.answers) {
		var answer = data.answers[key];
		var p = answerHtmls[answer.player.user_id];
		var user;
		var bonus;
		var winner;
		var vfw;
		var acroanswer;
		var points;
		if(p==null) {
			p = $("<answer/>");
			user = $("<user/>");
			bonus = $("<bonus/>");
			winner = $("<winner/>");
			vfw = $("<votedForWinner/>");
			acroanswer = $("<acroanswer/>");
			points = $("<points/>");
			p.append(points);
			p.append(user);
			p.append(winner);
			p.append(bonus);
			p.append(vfw);
			p.append(acroanswer);
			$("round answers").append(p);
		} else {
			user = p.find("user");
			bonus = p.find("bonus");
			winner = p.find("winner");
			vfw = p.find("votedForWinner");
			acroanswer = p.find("acroanswer");
			points = p.find("points");
		}
		points.addClass('hide');
		bonus.addClass('hide');
		vfw.addClass('hide');
		winner.addClass('hide');
		user.addClass('hide');
		if(!results) {
			winnerVotersHtml = [];
			winnerVotersPointsHtml = [];
			winnerHtml = null;
			winnerPointsHtml = null;
			bonusHtml = null;
			bonusPointsHtml = null;
		} else {
			user.removeClass('hide');
			user.text(answer.player.username);
			points.removeClass('hide');
			points.text(answer.vote_count);
			if(data.winner==answer.player.user_id) {
				winnerHtml = winner;
				winnerPointsHtml = points;

			}
			if(data.speeder==answer.player.user_id) {
				console.log('speeder is ' + answer.player.user_id);
				bonusHtml = bonus;
				bonusPointsHtml = points;
			}
			console.log(answer.player.username + " "+ answer.player.user_id + " in " + data.winner_bonuses +" ? " + $.inArray(answer.player.user_id,data.winner_bonuses));
			if($.inArray(answer.player.user_id,data.winner_bonuses)>-1) {
				winnerVotersHtml.push(vfw);
				winnerVotersPointsHtml.push(points);
			}
		}	
		p.attr('id',answer.player.user_id);
		acroanswer.text(answer.text);
		acroanswer.attr('id',answer.player.user_id);
		answerHtmls[answer.player.user_id] = p;
		if(answer.player.user_id==player_id) {
			acroanswer.addClass('my_answer');
		}
	}
	
	if(!results) {
		answerTime = room.vote_time;
	} else {
		answerTime = room.new_round_time;
		setTimeout(function() {
			winnerHtml.removeClass('hide');
			var pointsVal = parseInt(winnerPointsHtml.text());
			pointsVal+=round.acronym.length;
			winnerPointsHtml.text(""+pointsVal);
			setTimeout(function() {
				bonusHtml.removeClass('hide');
				var pointsVal = parseInt(bonusPointsHtml.text());
				pointsVal+=2;
				bonusPointsHtml.text(""+pointsVal);
				setTimeout(function() {
					for(var k in winnerVotersHtml) {
						var html = winnerVotersHtml[k];
						html.removeClass('hide');
						var pointsVal = parseInt(winnerVotersPointsHtml[k].text());
						pointsVal+=1;
						winnerVotersPointsHtml[k].text(""+pointsVal);	
					}
				},4000);
			},4000);			
		},3000);
		
	}
	$('round timer text').text(answerTime + "");
	if(votingRoundTimer!=null) {
		clearInterval(votingRoundTimer);
		$("#voting_music")[0].pause();
		$("#voting_music")[0].currentTime=0;
	}
	votingRoundTimer = setInterval(function() {
		answerTime -= 1;
		$('round timer text').text(answerTime + "");
		if (answerTime == 0) {
			clearInterval(votingRoundTimer);
			votingRoundTimer = null;
			$("#voting_music")[0].pause();
			$("#voting_music")[0].currentTime=0;
		}
	}, 1000);
	if(!results) {
		$("#voting_music")[0].play();
	}
}

function handleFaceoffRound(data) {
	round = data;
	showRound(data);
}

function handleFaceoffLosers(data) {
	faceoff = data;
	$("round").addClass('gone');
	$("#faceoff_round").removeClass('gone');
	var players = [data.player_a,data.player_b];
	var answers = [$("<faceoffanswer/>"),$("<faceoffanswer/>")];
	var cham = $("<cham/>");
	$("faceoffanswers").empty();
	$("faceofftotals").empty();
	$("faceofftotals").append(cham);
	for(var i=0; i<2;i++) {
			$("faceoffanswers").append("<spacermaker/>");
		var answer = $("<faceoffanswer/>");
		var player = players[i];
		var score = $("<score/>");
		var username = $("<username/>");
		var faceoffacroanswer = $("<faceoffacroanswer/>");
		answer.attr('id',player.user_id);
		score.addClass('hide');
		username.addClass('hide');
		answer.append(score);
		answer.append(username);
		answer.append(faceoffacroanswer);
		var total;
		if(i==0) {
			total = $("<totall/>");
		} else {
			total = $("<totalr/>");
		}
		var score = $("<totalscore/>");
		score.text(""+0);
		var namecont = $("<totalname/>");
		var name = $("<p/>");
		name.text(player.username);
		total.append(score);
		namecont.append(name);
		total.append(namecont);
		cham.append(total);
		$("faceoffanswers").append(answer);
		cham.append(total);
	}
}

function handleRound(data) {
	round = data;
	showRound(data);
	playRound(data);
}

function playRound(data) {
	$("#round_music")[0].play();
}

function handleRoomList(data) {
	rooms = data;
	//showRooms(rooms);
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
	updateWaiting(data);
}

function updateWaiting(data) {
	if(room.player_count<3) {
		//$('#waiting_for_players').removeClass('gone');
		var diff = 3-room.player_count;
		$('#waiting_needed').text('Waiting for ' + (diff) + ' more player' + ((diff==1) ? '' : 's') + '...');
		//$('inputbox input').focus();
	} else {
		//$('#waiting').removeClass('gone');
	}
}

function notifyNewUser(data) {
	var line = $("<line/>");
	var message = $("<message/>");
	message.addClass('center');
	message.text(data.username + " joined the room.");
	line.append(message);
	$("chat lines").append(line);
}

function handleUserLeave(data) {
	notifyUserLeft(room.players[data]);
	delete room.players[data];
	showUsers(room.players);
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
	round = data.current_round;
	hideRooms();
	showRoom(room);
	showUsers(room.players)
}

function hideRooms() {
	$("round").addClass('gone');
}

function showRoom(room) {
	$('round').addClass('gone');
	if(room.player_count<3) {
		$('#waiting_for_players').removeClass('gone');
		var diff = 3-room.player_count;
		$('#waiting_needed').text('Waiting for ' + (diff) + ' more player' + ((diff==1) ? '' : 's') + '...');
		$('inputbox input').focus();
	} else {
		$('#waiting').removeClass('gone');
	}
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
	$("#make_acronym").removeClass('gone');
	$('answer input').empty();
	$('round acro').text(round.acronym);
	$('answer input').val('').focus();
	$('answer received').addClass('hide');
	if (roundTimer != null) {
		clearInterval(roundTimer);
		$("#round_music")[0].pause();
		$("#round_music")[0].currentTIme=0;
	}
	roundTime = room.answer_time;
	$('round timer text').text(roundTime + "");
	roundTimer = setInterval(function() {
		roundTime -= 1;
		$('round timer text').text(roundTime + "");
		if (roundTime == 0) {
			clearInterval(roundTimer);
			$("#round_music")[0].pause();	
			$("#round_music")[0].currentTime=0;	
		}
	}, 1000);
	$("#round_music")[0].play();
}

function showUsers(users) {
	$('users').empty();
	var	sortedUsers = []
	for (var key in users) {
		sortedUsers.push(users[key]);
	}
	sortedUsers.sort(function (a,b) {
		if(a.total_vote_count > b.total_vote_count) {
			return -1;
		}
		if(a.total_vote_count < b.total_vote_count) {
			return 1;
		}
		return 0;
	});
	for (var key in sortedUsers) {
		var u = sortedUsers[key];
		var score = $("<score/>");
		var user = $("<user/>");
		var name = $("<name/>");
		score.text(u.total_vote_count);
		name.text(u.username);
		user.append(score);
		user.append(name);
		$("users").append(user);
	}
	$('users').show();

}

function message(msg) {
	$('#chatLog').append(msg + '</p>');
}

$(document).ready(function() {
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
		$('acroanswer').live('click', onAnswerClick);
		$('inputcont input').live('keypress', onUsernamePress);
		$('answer input').live('keypress', onAnswerPress);
		$('lines inputbox input').live('keypress', onChatPress);
	} //End connect
});

var player;
var playerReady = false;
function onYouTubePlayerAPIReady() {
  player = new YT.Player('ytplayer', {
    events: {
 //     'onReady': onPlayerReady,
   //   'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerRead(event) {
	var docElm = player;
	if (docElm.requestFullscreen) {
	    docElm.requestFullscreen();
	}
	else if (docElm.mozRequestFullScreen) {
	    docElm.mozRequestFullScreen();
	}
	else if (docElm.webkitRequestFullScreen) {
	    docElm.webkitRequestFullScreen();
	}
	
}

