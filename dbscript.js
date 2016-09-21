(function($){

	var db;

	var openRequest = indexedDB.open("notelist",1);

	openRequest.onupgradeneeded = function(e) {
		console.log("Upgrading DB...");
		var thisDB = e.target.result;
		if(!thisDB.objectStoreNames.contains("noteliststore")) {
			thisDB.createObjectStore("noteliststore", { autoIncrement : true });
		}
	}

	//on successfully opened DB request
	openRequest.onsuccess = function(e) {
		console.log("Open Success!");
		db = e.target.result;
		document.getElementById('btnAddNote').addEventListener('click', function(){

			//checking for javascript injection
			var textName = (document.getElementById('txtName').value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
			var textSubject = (document.getElementById('txtSubject').value).replace(/</g, "&lt;").replace(/>/g, "&gt;");;
			var textMessage = (document.getElementById('txtMsg').value).replace(/</g, "&lt;").replace(/>/g, "&gt;");;

			if (!textName.trim()){
				alert('Please enter the value for Name');
			}
			else if(!textSubject.trim()){
				alert('Please enter the value for Subject');
			}
			else if (!textMessage.trim()) {
        		alert('Please enter the value for Message');
        	} else {
        		addNote(new Note(textName,textSubject,textMessage,null));
        	}
        });

        document.getElementById('btnClear').addEventListener('click',function(){
        	ClearData();
        });

        $('#DetailView').empty();
		$('#DetailView').html('<div class="DetailViewContent"> Select a Note from Left Panel to look into the detailed message. </div>');

        renderNoteList();
	}

	openRequest.onerror = function(e) {
		console.log("Open Error!");
		console.dir(e);
	}

	//Note Object for constructor patten 
	function Note(name,subject,message,timestamp){
		this.name = name;
		this.subject = subject;
		this.message = message;
		this.timeStamp = timestamp;
	}

	//Adding a note to the Db and appending it to the list view
	function addNote(note) {
		console.log('adding ' + note.name + ',' + note.subject +',' + note.message +',' + note.timeStamp);
		var transaction = db.transaction(["noteliststore"],"readwrite");
		var store = transaction.objectStore("noteliststore");
		var request = store.add({Name: note.name, Subject: note.subject, Message: note.message, TimeStamp : GetTimeStamp()});
		request.onerror = function(e) {
			console.log("Error",e.target.error.name);
	    }
	    request.onsuccess = function(e) {
	    	console.log('added ' + note.name + ',' + note.subject +',' + note.message +',' + note.wordcount);
	    	ClearData();
	    	renderNoteList();
	    }
	}

	//Render the notes in the list view
	function renderNoteList(){
		$('#listViewWrapper').empty();
		$('#listViewWrapper').html('<table class="viewTable"><tr><th>Subject</th><th>Date Created</th><th># Of Character</th><th>Select</th></tr></table>');

		var countRequest = GetTransactionObject('readonly').count();
		countRequest.onsuccess = function(){ console.log(countRequest.result) 
			$('#listViewHeader').empty();
			$('#listViewHeader').html('<label> Total Number of Notes : '+countRequest.result +'</label>');
		};

		// Get all Objects
		var objectStore = GetTransactionObject('readonly');
		objectStore.openCursor().onsuccess = function(event) {
			var cursor = event.target.result;
			if (cursor) {
				var note = new Note(cursor.value.Name, cursor.value.Subject, cursor.value.Message, cursor.value.TimeStamp);
				var $link = $('<a href="#" data-key="' + cursor.key + '">' + note.subject + '</a>');
				$link.click(function(){
					loadNote(parseInt($(this).attr('data-key')));
				});
	
		  		var $dellink = $('<a href="#" data-key="' + cursor.key + '">Delete</a>');
		  			$dellink.click(function(){
		  			console.log('Delete ' + cursor.key);
		  			deleteNote(parseInt($(this).attr('data-key')));
		  		});

				var $row = $('<tr>');
				var $subjectCell = $('<td></td>').append($link);
				var $dateCell = $('<td>' + GetDate(note.timeStamp) + '</td>');
				var $countCell = $('<td>' + note.message.length + '</td>');
				var $deleteCell = $('<td></td>').append($dellink);

				$row.append($subjectCell);
				$row.append($dateCell);
				$row.append($countCell);
				$row.append($deleteCell);
				$('#listViewWrapper table').append($row);
				cursor.continue();
			}
		};
	}

	//Load the seleted note in the detailed view
	function loadNote(key){
		var store = GetTransactionObject('readonly');
		var request = store.get(key);
		request.onerror = function(event) {
		  alert('Please contact adminsitrator');
		};
		request.onsuccess = function(event) {
		 
		  var note = new Note(request.result.Name, request.result.Subject, request.result.Message,request.result.TimeStamp);
	
		  var detailText = '<div class="DetailViewContent">' + 'Note Details<hr>From :  &nbsp;&emsp;&emsp;&emsp;'+ note.name;
		  detailText += '<br>Date : &emsp;&emsp;&emsp; ' + GetDate(note.timeStamp) +' <br>Subject : &emsp;&emsp;' + note.subject;
		  detailText += '<br><hr> Message: <blockquote>' + note.message + '</blockquote> </div>';
	
		  $('#DetailView').html(detailText);
		  var $delBtn = $('<button class="btnDelete">Delete Note</button>');
		  $delBtn.click(function(){
		  	console.log('Delete ' + key);
		  	deleteNote(key);
		  });
		  $('#DetailView').append($delBtn);
		};
	}


	//Delete a note
	function deleteNote(key) {
		var store = GetTransactionObject('readwrite');
		var request = store.delete(key);
		request.onsuccess = function(evt){
			renderNoteList();
			$('#DetailView').empty();
			$('#DetailView').html('<div class="DetailViewContent"> Note successfully removed! </div>');
		};
	}

	//Clears the input field
	function ClearData(){
			document.getElementById('txtName').value = '';
			document.getElementById('txtSubject').value ='';
			document.getElementById('txtMsg').value = '';
	}

	//Generates Time Stamp
	function GetTimeStamp(){
			if (!Date.now) {
			    Date.now = function now() {
			        return new Date().getTime();
			    };
			}
			return Date.now();
	};

	//Returns Date with time from timestamp
	function GetDate(timestamp){
		var d = new Date(timestamp);
		return (d.getMonth()+1 + '/' + d.getDate() + '/' + d.getFullYear() +' ' + d.getHours() +':' + d.getMinutes());
	}

	//Get Transaction Object
	function GetTransactionObject(permission)
	{
		var transaction = db.transaction(['noteliststore'], permission);
		return transaction.objectStore('noteliststore');
	}

})(jQuery);