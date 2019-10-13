const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');

//Post model
const Post = require('../../models/Post');
//profile model
const Profile = require('../../models/Profile');

//validation
const validatePostInput = require('../../validation/post');

// @route   GET api/posts/test
// @desc    Tests post route
// @access  Public
router.get('/test', (req, res) => res.json({ msg: 'Posts Works' }));

// @route   GET api/posts
// @desc    Get post
// @access  Public
router.get('/', (req, res) => {
	Post.find()
		.sort({ date: -1 })
		.then(posts => res.json(posts))
		.catch(err => res.status(404).json({ nopostfound: 'no posts with this id' }));
});

// @route   GET api/posts/:id
// @desc    Get post by id
// @access  Public
router.get('/:id', (req, res) => {
	Post.findById(req.params.id)
		.then(post => res.json(post))
		.catch(err => res.status(404).json({ nopostfound: 'no post with this id' }));
});

// @route   POST api/posts
// @desc    Create post
// @access  Private
router.post('/', passport.authenticate('jwt', { session: false }), (req, res) => {
	const { errors, isValid } = validatePostInput(req.body);

	//check validation
	if(!isValid) {
		//if any errors send 400 error with error objects
		return res.status(400).json(errors);
	}

	const newPost = new Post({
		text: req.body.text,
		name: req.body.name,
		avatar: req.body.avatar,
		user: req.user.id
	});

	newPost.save().then(post => res.json(post));
});


/*
router.get('/', (req, res) => {
	Post.find()
		.sort({ date: -1 })
		.then(posts => res.json(posts))
		.catch(err => res.status(404).json({ nopostfound: 'no posts with this id' }));
});
*/


// @route   DELETE api/posts/:id
// @desc    Delete post
// @access  Private
router.delete('/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
	Profile.findOne({ user: req.user.id })
		.then(profile => {
			Post.findById(req.params.id)
				.then(post => {
					//check for post owner
					if(post.user.toString() !== req.user.id) {
						return res.status(401).json({ notauthorized: 'user not aithorized' });
					}

					//Delete

					post.remove().then(() => res.json({ success: true }));
				})
				.catch(err => res.status(404).json({ postnotfound: 'no post found' }));
		});
});

// @route   POST api/posts/like/:id
// @desc    Like post
// @access  Private
router.post('/like/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
	Profile.findOne({ user: req.user.id })
		.then(profile => {
			Post.findById(req.params.id)
				.then(post => {
					if(post.likes.filter(like => like.user.toString() === req.user.id).length > 0) {
						return res.status(400).json({ alreadyLiked: 'User already liked this post' });
					}

					//Add user id to like array
					post.likes.unshift({ user: req.user.id });

					post.save().then(post => res.json(post));
				})
				.catch(err => res.status(404).json({ postnotfound: 'no post found' }));
		});
});

// @route   POST api/posts/unlike/:id
// @desc    UnLike post
// @access  Private
router.post('/unlike/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
	Profile.findOne({ user: req.user.id })
		.then(profile => {
			Post.findById(req.params.id)
				.then(post => {
					if(post.likes.filter(like => like.user.toString() === req.user.id).length === 0) {
						return res.status(400).json({ notLiked: 'You have not yet liked the post' });
					}

					//Get remove Index
					const removeIndex = post.likes
						.map(item => item.user.toString())
						.indexOf(req.user.id);

					//splice out of array
					post.likes.splice(removeIndex, 1);

					//save
					post.save().then(post => res.json(post));
				})
				.catch(err => res.status(404).json({ postnotfound: 'no post found' }));
		});
});

// @route   POST api/posts/comment/:id
// @desc    Add comment to post
// @access  Private
router.post('/comment/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
	const { errors, isValid } = validatePostInput(req.body);

	//check validation
	if(!isValid) {
		//if any errors send 400 error with error objects
		return res.status(400).json(errors);
	} 

	Post.findById(req.params.id)
		.then(post => {
			const newComment = {
				text: req.body.text,
				name: req.body.name,
				avatar: req.body.avatar,
				user: req.user.id
			}

			//Add at comments array
			post.comments.unshift(newComment);
			//Save
			post.save().then(post => res.json(post))
		})
		.catch(err => res.status(404).json({ postnotfound: 'No post found' }));
});

// @route   DELETE api/posts/comment/:id/comment_id
// @desc    Remove comment from post
// @access  Private
router.delete('/comment/:id/:comment_id', passport.authenticate('jwt', { session: false }), (req, res) => { 

	Post.findById(req.params.id)
		.then(post => {
			//check if comment exists
			if(post.comments.filter(comment => comment._id.toString() === req.params.comment_id).length === 0) {
				return res.status(404).json({ commentnotexists: 'Comment does not exists' });
			}

			//Get remove Index
			const removeIndex = post.comments
				.map(item => item._id.toString())
				.indexOf(req.params.comment_id);

			//splice out of index
			post.comments.splice(removeIndex, 1);

			post.save().then(post => res.json(post));
		})
		.catch(err => res.status(404).json({ postnotfound: 'No post found' }));
});


module.exports = router;
