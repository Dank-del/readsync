/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1788416371")

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "number336246304",
    "max": null,
    "min": 1,
    "name": "page",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "number1589669063",
    "max": null,
    "min": null,
    "name": "word_index",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text857646122",
    "max": 0,
    "min": 1,
    "name": "word_text",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1788416371")

  // remove field
  collection.fields.removeById("number336246304")

  // remove field
  collection.fields.removeById("number1589669063")

  // remove field
  collection.fields.removeById("text857646122")

  return app.save(collection)
})
