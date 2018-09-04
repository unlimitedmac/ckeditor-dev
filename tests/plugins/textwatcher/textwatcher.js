/* bender-tags: editor */
/* bender-ckeditor-plugins: textwatcher */

( function() {
	'use strict';

	bender.editor = true;

	bender.test( {

		'test destroy': function() {
			var editor = this.editor,
				checkSpy = sinon.spy( CKEDITOR.plugins.textWatcher.prototype, 'check' ),
				textwatcher = attachTextWatcher( editor ),
				unmatchSpy = sinon.spy( textwatcher, 'unmatch' );

			textwatcher.destroy();

			editor.editable().fire( 'keyup', new CKEDITOR.dom.event( {} ) );
			checkSpy.restore();
			assert.isFalse( checkSpy.called, 'Check called on keyup' );

			editor.fire( 'blur', new CKEDITOR.dom.event( {} ) );
			assert.isFalse( unmatchSpy.called, 'Unmatch called on blur' );

			editor.fire( 'beforeModeUnload', new CKEDITOR.dom.event( {} ) );
			assert.isFalse( unmatchSpy.called, 'Unmatch called on beforeModeUnload' );

			editor.fire( 'setData', new CKEDITOR.dom.event( {} ) );
			assert.isFalse( unmatchSpy.called, 'Unmatch called on setData' );

			editor.fire( 'afterCommandExec', { command: new CKEDITOR.command( editor, {} ) } );
			assert.isFalse( unmatchSpy.called, 'Unmatch called on afterCommandExec' );

			assert.areEqual( 0, textwatcher._listeners.length, 'Listeners has not been emptied' );
		},

		'test checks text on keyup': function() {
			var editor = this.editor,
				spy = sinon.spy( CKEDITOR.plugins.textWatcher.prototype, 'check' );

			attachTextWatcher( editor );

			editor.editable().fire( 'keyup', new CKEDITOR.dom.event( {} ) );

			spy.restore();

			assert.isTrue( spy.calledOnce );
		},

		'test unmatch text on afterCommandExec': function() {
			var editor = this.editor,
				spy = sinon.spy( attachTextWatcher( editor ), 'unmatch' );

			editor.fire( 'afterCommandExec', { command: new CKEDITOR.command( editor, {} ) } );

			assert.isTrue( spy.calledOnce );
		},

		'test unmatch text on blur': function() {
			var editor = this.editor,
				spy = sinon.spy( attachTextWatcher( editor ), 'unmatch' );

			editor.fire( 'blur' );

			assert.isTrue( spy.calledOnce );
		},

		'test unmatch text on beforeModeUnload': function() {
			var editor = this.editor,
				spy = sinon.spy( attachTextWatcher( editor ), 'unmatch' );

			editor.fire( 'beforeModeUnload' );

			assert.isTrue( spy.calledOnce );
		},

		'test unmatch text on setData': function() {
			var editor = this.editor,
				spy = sinon.spy( attachTextWatcher( editor ), 'unmatch' );

			editor.fire( 'setData' );

			assert.isTrue( spy.calledOnce );
		},

		'test unmatch fires unmatched event': function() {
			var editor = this.editor,
				textMatcher = attachTextWatcher( editor ),
				spy = sinon.spy( textMatcher, 'fire' );

			textMatcher.unmatch();

			assert.isTrue( spy.calledOnce );
			assert.isTrue( spy.calledWith( 'unmatched' ) );
		},

		'test unmatch resets the state': function() {
			var editor = this.editor,
				textMatcher = attachTextWatcher( editor );
			textMatcher.lastMatched = 'foo';

			textMatcher.unmatch();

			assert.isNull( textMatcher.lastMatched );
		},

		'test consumeNext sets ignore state': function() {
			var editor = this.editor,
				textMatcher = attachTextWatcher( editor );
			textMatcher.ignoreNext = false;

			textMatcher.consumeNext();

			assert.isTrue( textMatcher.ignoreNext );
		},

		'test check with ignoreNext ignores next check': function() {
			var editor = this.editor,
				textMatcher = attachTextWatcher( editor ),
				callbackSpy = sinon.spy( textMatcher, 'callback' );

			textMatcher.ignoreNext = true;

			textMatcher.check();

			assert.isFalse( textMatcher.ignoreNext );
			assert.isTrue( callbackSpy.notCalled );
		},

		'test check ignores control keys': function() {
			var editor = this.editor,
				keyName = 'keyup',
				textMatcher = attachTextWatcher( editor ),
				callbackSpy = sinon.spy( textMatcher, 'callback' );

			textMatcher.check( getKeyEvent( keyName, 16 ) ); // Shift
			textMatcher.check( getKeyEvent( keyName, 17 ) ); // Ctrl
			textMatcher.check( getKeyEvent( keyName, 18 ) ); // Alt
			textMatcher.check( getKeyEvent( keyName, 91 ) ); // Cmd
			textMatcher.check( getKeyEvent( keyName, 35 ) ); // End
			textMatcher.check( getKeyEvent( keyName, 36 ) ); // Home
			textMatcher.check( getKeyEvent( keyName, 37 ) ); // Left
			textMatcher.check( getKeyEvent( keyName, 38 ) ); // Up
			textMatcher.check( getKeyEvent( keyName, 39 ) ); // Right
			textMatcher.check( getKeyEvent( keyName, 39 ) ); // Right
			textMatcher.check( getKeyEvent( keyName, 33 ) ); // PageUp
			textMatcher.check( getKeyEvent( keyName, 34 ) ); // PageDown

			assert.isTrue( callbackSpy.notCalled );
		},

		'test check ignored without proper selection': function() {
			var editor = this.editor,
				textMatcher = attachTextWatcher( editor ),
				callbackSpy = sinon.spy( textMatcher, 'callback' );

			editor.getSelection().removeAllRanges();

			textMatcher.check( {} );

			assert.isTrue( callbackSpy.notCalled );
		},

		'test check ignored with existing match': function() {
			var editor = this.editor, bot = this.editorBot,
				expectedMatch = 'Lorem ipsum dolor sit amet, consectetur.',
				textMatcher = attachTextWatcher( editor, function() {
					return { text: expectedMatch };
				} ),
				spy = sinon.spy( textMatcher, 'fire' );

			bot.setHtmlWithSelection( 'Lorem ipsum dolor ^sit amet, consectetur.' );

			textMatcher.lastMatched = expectedMatch;
			textMatcher.check( {} );

			assert.isFalse( spy.calledWith( 'matched' ) );
		},

		'test check fired with new match': function() {
			var editor = this.editor, bot = this.editorBot,
				expectedMatch = 'Lorem ipsum dolor sit amet, consectetur.',
				textMatcher = attachTextWatcher( editor, function() {
					return { text: expectedMatch };
				} ),
				spy = sinon.spy( textMatcher, 'fire' );

			bot.setHtmlWithSelection( 'Lorem ipsum dolor ^sit amet, consectetur.' );

			textMatcher.check( {} );

			assert.isTrue( spy.calledWith( 'matched' ) );
		},

		'test check unmatches last match with failing match': function() {
			var editor = this.editor, bot = this.editorBot,
				textMatcher = attachTextWatcher( editor, function() {
					return null;
				} ),
				spy = sinon.spy( textMatcher, 'unmatch' );

			textMatcher.lastMatched = 'Lorem ipsum dolor sit amet, consectetur.';

			bot.setHtmlWithSelection( 'Lorem ipsum dolor ^sit amet, consectetur.' );

			textMatcher.check( {} );

			assert.isTrue( spy.calledOnce );
		},

		// (#1997)
		'test throttle': function() {
			var editor = this.editor,
				bot = this.editorBot,
				editable = editor.editable(),
				textWatcher = attachTextWatcher( editor, function() {
					return {
						text: 'test'
					};
				}, 100 ),
				callbackSpy = sinon.spy( textWatcher, 'callback' );

			bot.setHtmlWithSelection( 'Lorem ipsum dolor ^sit amet, consectetur.' );

			textWatcher.lastMatched = 'changed first time';
			editable.fire( 'keyup', new CKEDITOR.dom.event( {} ) );
			assert.isTrue( callbackSpy.calledOnce );

			textWatcher.lastMatched = 'changed second time';
			editable.fire( 'keyup', new CKEDITOR.dom.event( {} ) );
			assert.isTrue( callbackSpy.calledOnce );

			setTimeout( function() {
				resume( function() {
					textWatcher.lastMatched = 'changed third time';
					editable.fire( 'keyup', new CKEDITOR.dom.event( {} ) );
					assert.isTrue( callbackSpy.calledTwice );
				} );
			}, 100 );

			wait();
		},

		// (#2373)
		'test throttle synchronization': function() {
			var editor = this.editor,
				bot = this.editorBot,
				editable = editor.editable(),
				isSelCorrect;

			attachTextWatcher( editor, function( selectionRange ) {
				var range = editor.getSelection().getRanges()[ 0 ];
				isSelCorrect = range.startContainer.equals( selectionRange.startContainer );
				return {
					text: 'test'
				};
			}, 100 );

			bot.setHtmlWithSelection( '<b>[xxx]</b><i>yyy</i>' );

			editable.fire( 'keyup', new CKEDITOR.dom.event( {} ) );
			editable.fire( 'keyup', new CKEDITOR.dom.event( {} ) );

			bot.setHtmlWithSelection( '<b>xxx</b><i>[yyy]</i>' );

			setTimeout( function() {
				resume( function() {
					assert.isTrue( isSelCorrect );
				} );
			}, 100 );

			wait();
		}

	} );

	function attachTextWatcher( editor, callback, throttle ) {
		return new CKEDITOR.plugins.textWatcher( editor, callback || function() {}, throttle ).attach();
	}

	function getKeyEvent( keyName, keyCode ) {
		return {
			name: keyName,
			data: {
				getKey: function() {
					return keyCode;
				}
			}
		};
	}

} )();
