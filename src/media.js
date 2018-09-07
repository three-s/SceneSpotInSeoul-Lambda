"use strict";

const AWS = require("aws-sdk");
const middy = require("middy");
const {
  cors
} = require("middy/middlewares");
const uuidv4 = require("uuid/v4");

const info = require('./info');

const tableName = process.env.DYNAMODB_MEDIA_TABLE;
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const loadMedia = (event, context, callback) => {
  const params = {
    TableName: tableName
  };

  dynamoDb.scan(params, (error, result) => {
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: {
          "Content-Type": "application/json"
        },
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
      });
    });

    callback(null, {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(convertedItems)
    });
  });
};

const createMedia = (event, context, callback) => {
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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "Couldn't create the media item.",
          data: params.Item
        })
      });
      return;
    }

    info.updateInfo();

    callback(null, {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(params.Item)
    });
  });
};

const updateMedia = (event, context, callback) => {
  const data = JSON.parse(event.body);

  const params = {
    TableName: tableName,
    Key: {
      uuid: event.pathParameters.uuid
    },
    ExpressionAttributeNames: {
      "#media_name": "name",
      "#media_desc": "desc"
    },
    ExpressionAttributeValues: {
      ":name": data.name,
      ":desc": data.desc,
      ":image": data.image,
      ":tags": data.tags
    },
    UpdateExpression: "SET #media_name = :name, #media_desc = :desc, image = :image, tags = :tags",
    ReturnValues: "ALL_NEW"
  };

  dynamoDb.update(params, (error, result) => {
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "Couldn't update the media item.",
          data: data
        })
      });
      return;
    }

    info.updateInfo();

    callback(null, {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(result.Attributes)
    });
  });
};

const deleteMedia = (event, context, callback) => {
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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "Couldn't remove the media item."
        })
      });
      return;
    }

    info.updateInfo();

    callback(null, {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Removed ${event.pathParameters.uuid}`
      })
    });
  });
};

const loadHandler = middy(loadMedia)
  .use(cors())

const createHandler = middy(createMedia)
  .use(cors())

const updateHandler = middy(updateMedia)
  .use(cors())

const deleteHandler = middy(deleteMedia)
  .use(cors())

module.exports = {
  loadHandler,
  createHandler,
  updateHandler,
  deleteHandler
}