# 0x04. Files manager

## Introduction
This project is a summary of authentication, NodeJS, MongoDB, Redis, pagination and background processing. The objective is to build a simple platform to upload and view files:
1. User authentication via a token
2. List all files
3. Upload a new file
4. Change permission of a file
5. View a file
6. Generate thumbnails for images

You will be guided step by step in building it, but you have some freedoms of implementation, split in more files etc… (utils folder will be your friend).

## Learning Objectives
1. How to create an API with Express
2. How to authenticate a user
3. How to store data in MongoDB
4. How to store temporary data in Redis
5. How to setup and use a background worker


## Learning

Mocha is a testing framework for JavaScript. It works like a testing environment where you can write your tests, run them and check the results. The second item is assertion libraries, which provides a way to extend your tests beyond plain JavaScript syntax. The assertion libraries allow you to implement assertions to validate the results of your tests against the expected result. 



## Requirements
1. Allowed editors: vi, vim, emacs, Visual Studio Code
2. All your files will be interpreted/compiled on Ubuntu 18.04 LTS using `node` (version 12.x.x)
3. All your files should end with a new line
4. A `README.md` file, at the root of the folder of the project, is mandatory
5. Your code should use the `js` extension
6. Your code will be verified against lint using ESLint
## Tasks
### 0. Redis utils
Inside a folder `utils`, create a file `redis.js` that contains the class `RedisClient`.

`RedisClient` should have:
* a constructor that creates a client to Redis. Any error of the redis client must be displayed in the console (you should use `on(‘error’)` of the redis client.
* a function `isAlive` that returns `true` when the connection to Redis is a success otherwise, `false`.
* an asynchronous function `get` that takes a string key as argument and returns the Redis value stored for this key
* an asynchronous function `set` that takes a string key, a value and a duration in second as argument to store it in Redis (with an expiration set by the duration argument)
* an asynchronous function `del` that takes a string key as argument and remove the value in Redis for this key

After the class definition, create and export an instance of `RedisClient` called `redisClient`.

### 1. MongoDB utils

Inside the folder `utils`, create a file `db.js` that contains the class `DBClient`.

`DBClient` should have:
* the constructor that creates a client to MongoDB: host - from the environment variable `DB_HOST` or default `localhost`, port - from the environment variable `DB_PORT` or default `27017`, database - from the environment variable `DB_DATABASE` or default `files_manager`.
* a function `isAlive` that returns `true` when the connection to MongoDB is a success otherwise, `false`.
* an asynchronous function `nbUsers` that returns the number of documents in the collection `users`.
* an asynchronous function `nbFiles` that returns the number of documents in the collection `files`.

After the class definition, create and export an instance of `DBClient` called `dbClient`.

### 2. First API
Inside `server.js`, create the Express server. It should listen on the port set by the environment variable `PORT` or by default 5000. It should load all routes from the file `routes/index.js`.

Inside the folder `routes`, create a file `index.js` that contains all endpoints of our API:
* `GET /status` => `AppController.getStatus`
* `GET /stats` => `AppController.getStats`

Inside the folder `controllers`, create a file `AppController.js` that contains the definition of the 2 endpoints:
* `GET /status` should return if Redis is alive and if the DB is alive too by using the 2 utils created previously: `{ “redis”: true, “db”: true}` with a status code 200.
* `GET /stats` should return the number of users and files in DB: `{ “users”:12, “files”: 1231 }` with a status code 200. `users` collection must be used for counting all users. `files` collection must be used for counting all files.

### 3. Create a new user
Now that we have a simple API, it’s time to add users to our database. In the file `routes/index.js`, add a new endpoint: `POST /users` => `UsersController.postNew`. 

Inside `controllers`, add a file `UsersController.js` that contains the new endpoint: `POST /users` should create a new user in DB. To create a new user, you must specify an `email` and a `password`. If the `email` is missing, return an error `Missing email` with a status code 400. If the `password` is missing, return an error `Missing password` with a status code 400. If the`email` already exists in DB, return an error `Already exist` with a status code 400. The `password` must be stored after hashed in `SHA1`. The endpoint is returning only the new user with only the `email` and the `id` with status code 201. The new user must be saved in the collection `users`: `email`: same as the value received, `password`: `SHA1` value of the value received.

### 4. Authenticate a user
In the file `routes/index.js`, add 3 new endpoints:
* `GET /connect` => `AuthController.getConnect`
* `GET /disconnect` => `AuthController.getDisconnect`
* `GET /users/me` => `UserController.getMe`

Inside `controllers`, add a file `AuthController.js` that contains new endpoints:
* `GET /connect` should sign-in the user by generating a new authentication token. By using the header `Authentication` and the technique of the Basic auth (Base64 of the `<email>:<password>`, find the user associated to this email and this password (reminder: we are storing the SHA1 of the password).If no user has been found, return an error `Unauthorized` with a status code 401. Otherwise generate a random string (using `uuidv4`) as a token. Create a ke: `auth_<token>`. Use this key for storing in Redis (by using the `redisClient` created previously) the user ID for 24 hours. Return this token: `{ “token”: “155342df-2399-41da-9e8c-458b6ac52a0c”}` with a status code 200.

Now, we have a way to identify a user, create a token and use this token for 24h to access the API !.

Every authenticated endpoint of our API will look at this token inside the header `X-Token`.

* `GET /disconnect` should sign-out the user based on the token. Retrieve the user based on the token. If not found, return an error `Unauthorized` with a status code 401. Otherwise, delete the token in Redis and return nothing with a status code 204. 

 Inside the file `controllers/UsersController.js` add a new endpoint:
* `GET /users/me` should retrieve the user base on the token used. Retrieve the user based on the token. If not found, return an error `Unauthorized` with a status code 401. Otherwise, return the user object (`email` and `id` only).


### 5. First file
In the file `routes/index.js`, add a new endpoint: `POST /files` => `FilesController.postUpload`.

Inside `controllers`, add a file `FilesController.js` that contains the new endpoint: `POST /files` should create a new file in DB and in disk:
* Retrieve the user based on the token. If not found, return an error `Unauthorized` with a status code 401.
* To create a file, you must specify: `name` as filename, `type` either folder, file or image, `parentId` is optional as ID of the parent (default: 0 -> the root), `isPublic` is optional as boolean to define if the file is public or not (default: false), `data` is only for type = file | image as Base64 of the file content. If the `name` is missing, return an error `Missing name` with a status code 400. If the `type` is missing or not part of the list of accepted types, return an error `Missing type` with a status code 400. If the `data` is missing and `type != folder`, return an error `Missing data` with a status code 400. If the `parentId` is set then if no file is present in DB for this `parentId`, return an error `Parent not found` with a status code 400. If the file present in DB for this `parentId` is not of type `folder`, return an error `Parent is not a folder` with a status code 400.
* The user ID should be added to the document saved in DB - as owner of a file. If the type is `folder`, add the new file document in the DB and return the new file with a status code 201 otherwise all files will be stored locally in a folder (to create automatically if not present). The relative path of this folder is given by the environment variable `FOLDER_PATH`. If this variable is not present or empty, use `/tmp/files_manager` as storing folder path. Create a local path in the storing folder with filename a UUID. Store the file in clear (reminder: `data` contains the Base64 of the file) in this local path. Add the new file document in the collection `files` with these attributes: `userId`: ID of the owner document (owner from the authentication), `name`: same as the value received, `type`: same as the value received, `isPublic`: same as the value received, `parentId`: same as the value received - if not present: 0, `localPath`: for a `type=file|image`, the absolute path to the file save in local. Return the new file with a status code 201.


### 6. Get and list file
In the file `routes/index.js`, add 2 new endpoints: `GET /files/:id` => `FilesController.getShow`, `GET /files` => `FilesController.getIndex`

In the file `controllers/FilesController.js`, add the 2 new endpoints:
* `GET /files/:id` should retrieve the file document based on the ID. Retrieve the user based on the token. If not found, return an error `Unauthorized` with a status code 401. If no file document is linked to the user and the ID passed as parameter, return an error `Not found` with a status code 404. Otherwise , return the file document.

* `GET /files` should retrieve all users' file documents for a specific `parentId` and with pagination. Retrieve the user based on the token. If not found, return an error `Unauthorized` with a status code 401. Based on the query parameters `parentId` and `page`, return the list of file documents: 
* * `parentId` - No validation of `parentId` is needed - if the `parentId` is not linked to any user folder, returns an empty list. By default, `parentId` is equal to 0 = the root.
* * Pagination - Each page should be 20 items max. `page` query parameter starts at 0 for the first page. If it equals 1, it means it’s the second page (form the 20th to the 40th), etc. Pagination can be done directly by the `aggregate` of MongoDB.


### 7. File publish/unpublish
In the file `routes/index.js`, add 2 new endpoints: 
* `PUT /files/:id/publish` => `FilesController.putPublish`
* `PUT /files/:id/publish` => `FilesController.putUnpublish`

In the file `controllers/FilesController.js`, add the 2 new endpoints:
* `PUT /files/:id/publish` should set `isPublic` to `true` on the file document based on the ID. Retrieve the user based on the token. If not found, return an error `Unauthorized` with a status code 401. If no file document is linked to the user and the ID passed as parameter, return an error `Not found` with a status code 404. Otherwise update the value of `isPublic` to `true`. And return the file document with a status code 200.
* `PUT /files/:id/unpublish` should set `isPublic` to `false` on the file document based on the ID. Retrieve the user based on the token. If not found, return an error `Unauthorized` with a status code 401. If no file document is linked to the user and the ID passed as parameter, return an error `Not found` with a status code 404. Otherwise update the value of `isPublic` to `false` and return the file document with a status code 200.


### 8. File data
In the file `routes/index.js`, add one new endpoint:
* `GET /files/:id/data` => `FilesController.getFile`

In the file `controllers/FilesController.js`, add the new endpoint:
* `GET /files/:id/data` should return the content of the file document based on the ID. If no file document is linked to the ID passed as parameter, return an error `Not found` with a status code 404. If the file document (folder or file) is not public (`isPublic: false`) and no user authenticate or not the owner of the file, return an error `Not found` with a status code 404. If the type of the file document is `folder`, return an error `A folder doesn’t have content` with status code 400. If the file is not locally present, return an error `Not found` with a status code 404. Otherwise, by using the module `mime-types`, get the MIME-type based on the `name` of the file. Return the content of the file with the correct MIME-type.


### 9. Image Thumbnails
Update the endpoint `POST /files` endpoint to start a background processing for generating thumbnails for a file of type `image`. Create a `Bull` queue `fileQueue`. When a new image is stored (in local and in DB), add a job to this queue with the `userID` and `fileId`.

Create a file `worker.js`. By using the module `Bull`, create a queue `fileQueue`. Process this queue. If `fileId` is not present onf the job, raise an error `Missing fileId`. If `userId` is not present in the job, raise an error `Missing userId`. If no document is found in DB based on the `fileId` and `userId`, raise an error `File not found`. By using the module `image-thumbnail`, generate 3 thumbnails with `width` = 500, 250 and 100 - store each result on the same location of the original file by appending `_<width size>`

Update the endpoint `GET /files/:id/data` to accept a query parameter `size`. `size` can be 500, 250 or 100. Based on `size`, return the correct local file. If the local file doesn’t exist, return an error `Not found` with a status code 404.

