"use strict";

const AWS = require("aws-sdk");
const middy = require("middy");
const {
  cors
} = require("middy/middlewares");
const uuidv4 = require("uuid/v4");

const info = require('./info');

const tableName = process.env.DYNAMODB_LOCATIONS_TABLE;
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const loadLocations = (event, context, callback) => {
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
          message: "Couldn't fetch the locations."
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

const createLocation = (event, context, callback) => {
  const data = JSON.parse(event.body);

  const params = {
    TableName: tableName,
    Item: {
      uuid: uuidv4(),
      lat: data.lat,
      lon: data.lon,
      name: data.name,
      desc: data.desc,
      address: data.address,
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
          message: "Couldn't create the location item.",
          data: params.Item
        })
      });
      return;
    }

    info.updateInfo("locations");

    const item = params.Item;
    const itemTags = item.tags;      
    delete item.tags;
    const convertedItem = {
      data: item,
      tags: itemTags
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

const updateLocation = (event, context, callback) => {
  const data = JSON.parse(event.body);

  const params = {
    TableName: tableName,
    Key: {
      uuid: event.pathParameters.uuid
    },
    ExpressionAttributeNames: {
      "#location_name": "name",
      "#location_desc": "desc"
    },
    ExpressionAttributeValues: {
      ":lat": data.lat,
      ":lon": data.lon,
      ":name": data.name,
      ":desc": data.desc,
      ":address": data.address,
      ":image": data.image,
      ":tags": data.tags
    },
    UpdateExpression: "SET lat=:lat, lon=:lon, #location_name = :name, #location_desc = :desc, address = :address, image = :image, tags = :tags",
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
          message: "Couldn't update the location item.",
          data: data
        })
      });
      return;
    }

    info.updateInfo("locations");

    const item = result.Attributes;
    const itemTags = item.tags;      
    delete item.tags;
    const convertedItem = {
      data: item,
      tags: itemTags
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

const deleteLocation = (event, context, callback) => {
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
          message: "Couldn't remove the location item."
        })
      });
      return;
    }

    info.updateInfo("locations");

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

const loadHandler = middy(loadLocations)
  .use(cors())

const createHandler = middy(createLocation)
  .use(cors())

const updateHandler = middy(updateLocation)
  .use(cors())

const deleteHandler = middy(deleteLocation)
  .use(cors())

module.exports = {
  loadHandler,
  createHandler,
  updateHandler,
  deleteHandler
}