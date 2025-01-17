const express = require('express');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');
const passport = require('passport');

const router = express.Router();

router.post("/signup", signup)
router.post("/login", login)
router.post("/logout", logout)

const uri = 'mongodb://root:password@mongo:27017/';
const client = new MongoClient(uri);

function (accessToken, refreshToken, profile, cb) {
    const defaultUser = {
        googleID: profile.id,
        name: profile._json.name,
        photoURL: profile._json.picture,
        email: profile._json.email,
        doj: Date.now(),
        aboutMe: "I am newbie",
        theme: '9',
        friends: [],
        receiveRequests: [],
        sendRequests: [],
        groups: []
    };

    async function main() {
        try {
            await client.connect();
            let user = await client.db('chat-app').collection('userDetails').findOne( { email: defaultUser.email } );
            
            if (!user) {
                const { insertedId: _id } = await client.db('chat-app').collection('userDetails').insertOne( defaultUser );
                user = { _id, ...defaultUser };
                
                const response = await fetch(defaultUser.photoURL, { method: 'GET' });
                const data = await response.arrayBuffer();
                const typedArray = new Uint8Array(data);
                
                fs.writeFile(`./uploads/P-${_id}`, typedArray, (err) => {
                    if (err) {
                        console.error(err);
                        return ;
                    }
                    console.log("Google profile photo downloaded");
                })

                defaultUser.photoURL = `http://localhost:5000/group/photo/P-${_id}`;
                await client.db('chat-app').collection('userDetails').updateOne({ _id }, { $set: defaultUser });
            }
            return cb(null, user);
        } catch (e) {
            console.error(e);
            return cb(e, null);
        }
    }

    main().catch(console.error);
}));

router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/', successRedirect: `http://localhost:3000/chats/@me` }));

passport.serializeUser((user, cb) => {
    return cb(null, user);
});

passport.deserializeUser((user, cb) => {
    console.log("I am deserializing");
    async function main() {
        try {
            await client.connect();
            const userID = await client.db('chat-app').collection('userDetails').findOne( { _id: new ObjectId(user._id) } );
            return cb(null, userID);
        } catch (e) {
            console.error(e);
            return cb(e, null);
        }
    }

    main().catch(console.error);
});

module.exports = router;
