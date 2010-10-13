<?php

/**
 * @package TwiStream
 *
 * @author Zorin Vasily <kak.serpom.po.yaitsam@gmail.com>
 */
class TwiStream extends AppInstance {

	public function onReady() {	 
		$appInstance = $this;

		if ($this->WS = Daemon::$appResolver->getInstanceByAppName('WebSocketServer')) {
			$this->WS->addRoute('TwiStream',
				function ($client) use ($appInstance) {
					return new TwiStreamWebSocketSession($client, $appInstance);
				}
			);
		}
	}

}

class TwiStreamWebSocketSession extends WebSocketRoute { 
	
	private $requests = array();
	
	/**
	 * Called when new frame received.
	 * @param string Frame's contents.
	 * @param integer Frame's type.
	 * @return void
	 */
	public function onFrame($data, $type) {
		$o = json_decode($data, true);

		if (
			!isset($o['cmd']) 
			|| !is_string($o['cmd'])
		) {
			return;
		}

		if ($o['cmd'] === 'subscribe') {
			$r = new stdClass;
			$r->attrs = $o['attrs'];
			$req = new TwiStreamRequest($this->appInstance, $this->appInstance, $r);
			$req->sessions[$this->client->connId] = true;
			$this->requests[] = $req->queueId;
		}
	}

	public function onFinish() {		
		while ($id = array_pop($this->requests)) {
			if (!isset(Daemon::$worker->queue[$id])) {
				continue;
			}

			unset(Daemon::$worker->queue[$id]->sessions[$this->client->connId]);
		}		
	}
	
}

class TwiStreamRequest extends Request {

	public $stream;
	public $buf = '';
	public $sessions = array();
	
	public function onTweet($o) {		
		$str = json_encode(array('tweet' => $o, 'ts' => microtime(TRUE)));

		foreach ($this->sessions as $sessId => $v) {
			$this->appInstance->WS->sessions[$sessId]->sendFrame($str);
		}
	}

	/**
	 * Initialize stream
	 * @return vid
	 */
	private function initStream() {
		$this->stream = new AsyncStream('tcpstream://stream.twitter.com:80');
		$body = http_build_query($this->attrs);

		$this->stream->
			onReadData(
				function($stream, $data) {			
					$buf =& $stream->request->buf;
					$buf .= $data;
					
					if (!isset($stream->headersPassed)) {
						if (($p = strpos($buf, "\r\n\r\n")) !== false) {
							$buf = substr($buf, $p + 4);
							$stream->headersPassed = true;
						}
					}

					while (($p = strpos($buf, "\n")) !== false) {
						$stream->request->onTweet(json_decode(substr($buf, 0, $p), true));
						$buf = substr($buf, $p + 1);
					}
				}
			)->
			onEOF(
				function($stream) {
					$stream->request->wakeup();
				}
			)->
			setRequest($this)->
			enable()->
			write(
				"POST /1/statuses/filter.json HTTP/1.1\r\n" .
				"Connection: close\r\n" .
				"Content-type: application/x-www-form-urlencoded\r\n" .
				"Authorization: basic " . base64_encode(
					$this->appInstance->config->user->value . ':' . 
					$this->appInstance->config->password->value
				)."\r\n" .
				"Host: status.twitter.com\r\n" .
				"Accept: */*\r\n" .
				"Content-length: ".strlen($body)."\r\n" .
				"\r\n" .
				$body
			);
	}

	/**
	 * Initialize
	 * @return void
	 */
	public function init() {
		try {
			$this->initStream();
		} catch (BadStreamDescriptorException $e) {
//			$this->out('Connection error.');
			$this->finish();
		}
	}

	/**
	 * Called when the request aborted.
	 * @return void
	 */
	 public function onAbort() {
		if ($this->stream) {
			$this->stream->close();
		}
	}

	/**
	 * Called when request iterated.
	 * @return integer Status.
	 */
	public function run() {
		if (!$this->stream->eof()) {
			$this->sleep(0.1);
		}
	}
	
}
