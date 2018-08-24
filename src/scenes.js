"use strict";

const AWS = require("aws-sdk");
const uuidv4 = require("uuid/v4");

const info = require("./info");

const tableName = process.env.DYNAMODB_SCENES_TABLE;
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.loadScenes = (event, context, callback) => {
  const params = {
    TableName: tableName
  };

  dynamoDb.scan(params, (error, result) => {
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          message: "Couldn't fetch the scenes."
        })
      });
      return;
    }

    const convertedItems = new Array();
    result.Items.forEach(item => {
      const itemTags = item.tags;
      const relatedLocation = item.related_location;
      const relatedMedia = item.related_media;

      delete item.tags;
      delete item.related_location;
      delete item.related_media;

      convertedItems.push({
        data: item,
        tags: itemTags,
        related_location: relatedLocation,
        related_media: relatedMedia
      });
    });

    callback(null, {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(convertedItems)
    });
  });
};

exports.createScene = (event, context, callback) => {
  const data = JSON.parse(event.body);

  const params = {
    TableName: tableName,
    Item: {
      uuid: uuidv4(),
      desc: data.desc,
      image: data.image,
      related_location: data.related_location,
      related_media: data.related_media,
      tags: data.tags
    }
  };

  dynamoDb.put(params, error => {
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          message: "Couldn't create the scene item.",
          data: params.Item
        })
      });
      return;
    }

    info.updateInfo();

    callback(null, {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params.Item)
    });
  });
};

exports.updateScene = (event, context, callback) => {
  const data = JSON.parse(event.body);

  const params = {
    TableName: tableName,
    Key: {
      uuid: event.pathParameters.uuid
    },
    ExpressionAttributeNames: {
      "#scene_desc": "desc"
    },
    ExpressionAttributeValues: {
      ":desc": data.desc,
      ":image": data.image,
      ":related_location": data.related_location,
      ":related_media": data.related_media,
      ":tags": data.tags
    },
    UpdateExpression:
      "SET #scene_desc = :desc, image = :image, related_location = :related_location, related_media = :related_media, tags = :tags",
    ReturnValues: "ALL_NEW"
  };

  dynamoDb.update(params, (error, result) => {
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          message: "Couldn't update the scene item.",
          data: data
        })
      });
      return;
    }

    info.updateInfo();

    callback(null, {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.Attributes)
    });
  });
};

exports.deleteScene = (event, context, callback) => {
  const params = {
    TableName: tableName,
    Key: {
      uuid: event.pathParameters.uuid
    }
  };

  dynamoDb.delete(params, (error, result) => {
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          message: "Couldn't remove the scene item."
        })
      });
      return;
    }

    info.updateInfo();

    callback(null, {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Removed ${event.pathParameters.uuid}`
      })
    });
  });
};
