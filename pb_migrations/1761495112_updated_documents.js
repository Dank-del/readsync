/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // update field
  collection.fields.addAt(1, new Field({
    "hidden": false,
    "id": "file3630795382",
    "maxSelect": 1,
    "maxSize": 1000000,
    "mimeTypes": [
      "application/pdf",
      "application/epub+zip"
    ],
    "name": "document",
    "presentable": false,
    "protected": true,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752")

  // update field
  collection.fields.addAt(1, new Field({
    "hidden": false,
    "id": "file3630795382",
    "maxSelect": 1,
    "maxSize": 0,
    "mimeTypes": [],
    "name": "document",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  return app.save(collection)
})
