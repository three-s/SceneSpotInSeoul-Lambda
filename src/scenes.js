"use strict";

const AWS = require("aws-sdk");
const middy = require("middy");
const {
  cors
} = require("middy/middlewares");
const uuidv4 = require("uuid/v4");

const info = require("./info");

const tableName = process.env.DYNAMODB_SCENES_TABLE;
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const loadScenes = (event, context, callback) => {
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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(convertedItems)
    });
  });
};

const createScene = (event, context, callback) => {
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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "Couldn't create the scene item.",
          data: params.Item
        })
      });
      return;
    }

    info.updateInfo("scenes");

    const item = params.Item;
    const itemTags = item.tags;
    delete item.tags;
    const itemRelatedLocation = item.related_location;
    delete item.related_location;  
    const itemRelatedMedia = item.related_media;
    delete item.related_media;

    const convertedItem = {
      data: item,
      tags: itemTags,
      related_location: itemRelatedLocation,
      related_media: itemRelatedMedia
    };

    callback(null, {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(convertedItem)
    });
  });
};

const updateScene = (event, context, callback) => {
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
    UpdateExpression: "SET #scene_desc = :desc, image = :image, related_location = :related_location, related_media = :related_media, tags = :tags",
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
          message: "Couldn't update the scene item.",
          data: data
        })
      });
      return;
    }

    info.updateInfo("scenes");
    
    const item = result.Attributes;
    const itemTags = item.tags;
    delete item.tags;
    const itemRelatedLocation = item.related_location;
    delete item.related_location;  
    const itemRelatedMedia = item.related_media;
    delete item.related_media;

    const convertedItem = {
      data: item,
      tags: itemTags,
      related_location: itemRelatedLocation,
      related_media: itemRelatedMedia
    };

    callback(null, {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(convertedItem)
    });
  });
};

const deleteScene = (event, context, callback) => {
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
          message: "Couldn't remove the scene item."
        })
      });
      return;
    }

    info.updateInfo("scenes");

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

const loadHandler = middy(loadScenes)
  .use(cors())

const createHandler = middy(createScene)
  .use(cors())

const updateHandler = middy(updateScene)
  .use(cors())

const deleteHandler = middy(deleteScene)
  .use(cors())

module.exports = {
  loadHandler,
  createHandler,
  updateHandler,
  deleteHandler
}