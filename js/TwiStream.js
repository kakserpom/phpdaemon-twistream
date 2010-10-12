$.TwiStream =
{
 "serverUrl": {
                ws: 'ws://'+document.domain+'/TwiStream',
                comet  : 'http://'+document.domain+'/WebSocketOverCOMET/?_route=TwiStream',
                polling : 'http://'+document.domain+'/WebSocketOverCOMET/?_route=TwiStream'
              },
 "tabs": {},
 "curTab": '#room',
 "status": null,
 "authkey": null,
 "ws": null,
 "onStatusReady": null,
 "username": null,
 "lastRecipients": null,
 "userlistUpdateTimeout": null,
 "sentBytes": 0,
 "recvBytes": 0,
 "packetSeq": 1,
 "callbacks": {},
 query: function(o,c,d)
 {
  if ($.TwiStream.status == 0) {return;}
  o._id = ++$.TwiStream.packetSeq;
  if (c)
  {
   $.TwiStream.callbacks[o._id] = [c,d];
   $('.ajaxloader').show();
  }
  $.TwiStream.sendPacket(o);
 },
 "showEvent": function(o)
 {
  if (o.tweet != null) {
		var t = o.tweet;
		$('#tweets').prepend($('<div class="tweet">').html(htmlspecialchars(t.text)+' --- '+htmlspecialchars(t.user.screen_name)));
	}
	else if (o.mtype != null)
	{
	 $('#tweets').prepend('<div class="sysmsg" style="color: '+htmlspecialchars(o.color)+'"> '+htmlspecialchars(o.text)+'</div>');
	}
	while ($('#tweets div').size() > 10) {$('#tweets div:last').remove();};
 },
 "sendPacket": function(packet)
 {
  var s = $.toJSON(packet);
  $.TwiStream.sentBytes += s.length;
  try {$.TwiStream.ws.send(s);}
  catch (err) {}
 },
 "subscribe": function(attrs)
 {
  $.TwiStream.sendPacket({
   "cmd": "subscribe",
   "attrs": attrs,
  });
 },
 "keepalive": function()
 {
  $.TwiStream.sendPacket({
   "cmd": "keepalive"
  });
 },
 "init": function()
 {
   $.address.init(function(event) {}).change($.TwiStream.addressOnChange);
 },
 "addressOnChange": function()
 {
 },
 "initConnect": function()
 {
  $.TwiStream.connect();
  setInterval(function()
  {
   $.TwiStream.connect();
   $('.sentDataCounter').html(fsize($.TwiStream.sentBytes));
   $('.recvDataCounter').html(fsize($.TwiStream.recvBytes));
  },1000);
 },
 "connect": function()
 {
  if ($.TwiStream.ws != null)
  {
   if ($.TwiStream.ws.readyState != 2) {return;}
   else
   {
    $.TwiStream.showEvent({"text": "* Trying to reconnect..", "color": "gray", "mtype": "system"});
   }
  }
  $.TwiStream.showEvent({"text": "* Connecting...", "color": "gray", "mtype": "system"});
  $.TwiStream.ws = new WebSocketConnection({url: $.TwiStream.serverUrl,root: '/js/'});
  $.TwiStream.ws.onopen = function()
  {
   $.TwiStream.showEvent({"text": "* Connected successfully.", "color": "gray", "mtype": "system"});
   $.TwiStream.subscribe({track:'php'});
   setInterval(function()
   {
    $.TwiStream.keepalive();
   },20000);
  };
  $.TwiStream.ws.onmessage = function(e)
  {
   if (e.data == null) {return;}
   $.TwiStream.recvBytes += e.data.length;
   var o = $.parseJSON($.urldecode(e.data));
   if ((typeof (o._id) != 'undefined') && (typeof ($.TwiStream.callbacks[o._id]) != 'undefined'))
   {
    $.TwiStream.callbacks[o._id][0](o,$.TwiStream.callbacks[o._id][1]);
    delete $.TwiStream.callbacks[o._id];
   }
   if (o.tweet != null)
   {
    if (o.ts) {$.TwiStream.lastTS = o.ts;}
    $.TwiStream.showEvent(o);
   }
  };
  $.TwiStream.ws.onclose = function()
  {
   $.TwiStream.showEvent({"text": "* Ooops! You're disconnected from the server!", "color": "gray", "mtype": "system"});
   $.TwiStream.ws = null;
  };
 }
};
$.urlencode = function(s)
{
 if (typeof encodeURIComponent != 'undefined') {return encodeURIComponent(s).replace(new RegExp('\\+','g'), '%20');}
 return escape(s).replace(new RegExp('\\+','g'), '%20');
};
$.urldecode = function(s)
{
 return unescape(s).replace(new RegExp('\\+','g'),' ');
};
function htmlspecialchars(s)
{
 if (s == null) {return 'null';}
 var r = s;
 r = r.replace(new RegExp('&','g'),'&amp;');
 r = r.replace(new RegExp('"','g'),'&quot;');
 r = r.replace(new RegExp('\'','g'),'&#039;');
 r = r.replace(new RegExp('<','g'),'&lt;');
 r = r.replace(new RegExp('>','g'),'&gt;');
 return r;
}
function oldhtmlspecialchars(string)
{
 if (string == null) {return "";}
 return $('<span>').text(string).html();
}
function fsize(x)
{
 if (x >= 1024*1024*1024) {return (Math.floor(x/1024/1024/1024*100)/100)+' Gb';}
 if (x >= 1024*1024) {return (Math.floor(x/1024/1024*100)/100)+' Mb';}
 if (x >= 1024) {return (Math.floor(x/1024*100)/100)+' Kb';}
 return (x)+' B';
}
function Dump(d, l, t) {
 if (typeof(t) == "undefined") t = "\n";
 var space = (t == "\n")?' ':'&nbsp;';
    if (l == null) l = 1;
    var s = '';
    if (typeof(d) == "object") {
        s += typeof(d) + space+"{"+t;
        for (var k in d) {
            if (typeof(d[k]) != "function"){
             for (var i=0; i<l; i++) s += space+space;
             s += k+":"+space + Dump(d[k],l+1, t);
            }
        }
        for (var i=0; i<l-1; i++) s += space+space;
        s += "}"+t;
    } else if (typeof(d) != "function"){
        s += "" + d + t;
    }
    return s;
}
$(document).ready(function() {
	$.TwiStream.init();
	$.TwiStream.initConnect();
});
