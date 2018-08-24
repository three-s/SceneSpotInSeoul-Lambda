"use strict";

const AWS = require("aws-sdk");
const uuidv4 = require("uuid/v4");

const tableName = process.env.DYNAMODB_MEDIA_TABLE;
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.loadMedia = (event, context, callback) => {
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
          message: "Couldn't fetch the media."
        })
      });
      return;
    }

    const convertedItems = new Array();
    result.Items.forEach(item => {
      const itemTags = item.tags;
      delete item.tags;
      convertedItems.push({
        data: item,
        tags: itemTags
      })
    });

    callback(null, {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(convertedItems)
    });
  });
};

exports.createMedia = (event, context, callback) => {
  const data = JSON.parse(event.body);

  const params = {
    TableName: tableName,
    Item: {
      uuid: uuidv4(),
      name: data.name,
      desc: data.desc,
      image: data.image,
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
          message: "Couldn't create the media item.",
          data: params.Item
        })
      });
      return;
    }
    callback(null, {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params.Item)
    });
  });
};

exports.updateMedia = (event, context, callback) => {
  const data = JSON.parse(event.body);

  const params = {
    TableName: tableName,
    Key: {
      uuid: event.pathParameters.uuid
    },
    ExpressionAttributeNames: {
      '#media_name': 'name',
      '#media_desc': 'desc'
    },
    ExpressionAttributeValues: {
      ':name': data.name,
      ':desc': data.desc,
      ':image': data.image,
      ':tags': data.tags
    },
    UpdateExpression:
      "SET #media_name = :name, #media_desc = :desc, image = :image, tags = :tags",
    ReturnValues: "ALL_NEW"
  };

  dynamoDb.update(params, (error, result) => {
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          message: "Couldn't update the media item.",
          data: data
        })
      });
      return;
    }
    callback(null, {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.Attributes)
    });
  });
};

exports.deleteMedia = (event, context, callback) => {
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
          message: "Couldn't remove the media item."
        })
      });
      return;
    }
    callback(null, {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Removed ${event.pathParameters.uuid}`
      })
    });
  });
};
