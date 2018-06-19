
import mqtt from 'mqtt';
import config from '../config';

const MqttClient = function instance(options) {
  this.options = options;
  this.connect = false;
  this.init = false;
  this.client = null;
  this.subscribeMap = {};
};

function connect(clientProxy) {
  clientProxy.client = mqtt.connect(clientProxy.options);

  let { client } = clientProxy;
  clientProxy.init = true;
  client.on('connect', () => {
    console.log('Mqtt server connect success');
    for (let key in clientProxy.subscribeMap) {
      console.log(`Mqtt subscribe ${key}`);
      client.subscribe(key);
    }
    clientProxy.connect = true;
  });
  client.on('reconnect', () => {
    console.log('Mqtt server reconnect');
  });

  client.on('message', (topic, message) => {
    // console.log('Mqtt server message', topic, message);
    let callback = clientProxy.subscribeMap[topic];

    if (callback) {
      Promise.resolve(message)
        .then((result) => {
          return callback(result);
        }).catch((err) => {
          console.log(err);
        });
    }
  });
}

MqttClient.prototype.subscribe = function (topic, callback) {
  if (!this.init) {
    connect(this);
  } else if (this.connect) {
    console.log(`Mqtt subscribe ${topic}`);
    this.client.subscribe(topic);
  }
  this.subscribeMap[topic] = callback;
};

MqttClient.prototype.unsubscribe = function (topic) {
  if (!this.init) return;
  delete this.subscribeMap[topic];
  this.client.unsubscribe(topic);
};

MqttClient.prototype.publish = function (...args) {
  if (!this.init) {
    connect(this);
  }
  this.client.publish(...args);
};

export default new MqttClient(config.mqtt);
