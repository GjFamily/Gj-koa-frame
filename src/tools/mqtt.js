
import mqtt from 'mqtt';
import config from '../config';

const MqttClient = function instance(options) {
  this.options = options;
  this.connect = false;
  this.init = false;
  this.client = null;
  this.subscribeMap = {};
  this.publishList = [];
};

function connect(clientProxy) {
  clientProxy.client = mqtt.connect(clientProxy.options);

  let { client } = clientProxy;
  clientProxy.init = true;
  client.on('connect', () => {
    console.log('Mqtt server connect success');
    for (let key in clientProxy.subscribeMap) {
      console.log(`Mqtt subscribe ${key}`);
      let { qos } = clientProxy.subscribeMap[key];
      client.subscribe(key, { qos });
    }
    clientProxy.publishList.forEach((row) => {
      client.publish(...row);
    });
    clientProxy.connect = true;
  });
  client.on('reconnect', () => {
    console.log('Mqtt server reconnect');
  });
  client.on('disconnect', () => {
    console.log('Mqtt server disconnect');
  });

  client.on('message', (topic, message) => {
    // console.log('Mqtt server message', topic, message);
    let topic_info = clientProxy.subscribeMap[topic];

    if (topic_info) {
      let { callback } = topic_info;
      Promise.resolve(message)
        .then((result) => {
          return callback(result);
        }).catch((err) => {
          console.log(err);
        });
    }
  });
}

MqttClient.prototype.subscribe = function (topic, callback, qos = 0) {
  if (!this.init) {
    connect(this);
  } else if (this.connect) {
    console.log(`Mqtt subscribe ${topic}`);
    this.client.subscribe(topic, { qos });
  }
  this.subscribeMap[topic] = { callback, qos };
};

MqttClient.prototype.unsubscribe = function (topic) {
  if (!this.init) return;
  delete this.subscribeMap[topic];
  this.client.unsubscribe(topic);
};

MqttClient.prototype.publish = function (...args) {
  if (!this.init) {
    this.publishList.push(args);
    connect(this);
  } else {
    this.client.publish(...args);
  }
};

MqttClient.prototype.close = function () {
  if (this.init) {
    this.client.end();
  }
};

export default new MqttClient(config.mqtt);
