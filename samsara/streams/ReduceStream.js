/* Copyright © 2015-2016 David Valdman */
define(function(require, exports, module) {
    var Stream = require('./Stream');
    var SimpleStream = require('./SimpleStream');
    var Observable = require('./Observable');

    function ReduceStream(reducer, value, extras) {
        this.reducer = reducer;
        this.extras = extras;

        this.prev = null;
        this.next = null;

        this.head = this;
        this.headOutput = new SimpleStream();

        if (value) {
            this.value = value;
            this.input = new SimpleStream();
            this.output = (extras)
                ? Stream.lift(this.reducer, [this.input, this.value].concat(extras))
                : Stream.lift(this.reducer, [this.input, this.value]);
        }
        else {
            this.value = null;
            this.output = new Observable(0);
        }

        setHeadOutput.call(this, this.head.output);
    }

    ReduceStream.prototype = Object.create(Stream.prototype);
    ReduceStream.prototype.constructor = ReduceStream;

    ReduceStream.prototype.push = function(stream) {
        // refire the initial value if adding to an empty list
        if (this.head === this) this.output.set(0);

        var sizeArray = new ReduceStream(this.reducer, stream, this.extras);
        connect(this.head, sizeArray);

        this.head = sizeArray;
        setHeadOutput.call(this, this.head.output);

        return sizeArray.input;
    };

    ReduceStream.prototype.pop = function() {
        var prev = this.head.prev;

        sever(prev, this.head);
        this.head = prev;

        setHeadOutput.call(this, this.head.output);
    };

    ReduceStream.prototype.unshift = function(value) {
        var curr = this;
        var next = curr.next;

        if (!next) return this.push(value);

        var newNode = new ReduceStream(this.reducer, value, this.extras);

        sever(curr, next);
        connect(curr, newNode);
        connect(newNode, next);

        this.output.set(0);
        
        return newNode.input;
    };

    ReduceStream.prototype.shift = function(){
        this.remove(this.next.value);
    };

    ReduceStream.prototype.insertAfter = function(target, value) {
        var curr = getNode.call(this, target);
        if (!curr) return;

        var next = curr.next;

        if (next) {
            var newNode = new ReduceStream(this.reducer, value, this.extras);

            sever(curr, next);
            connect(newNode, next);
            connect(curr, newNode);

            return newNode.input;
        }
        else return this.push(value);
    };

    ReduceStream.prototype.insertBefore = function(target, value){
        var curr = getNode.call(this, target);
        if (!curr) return;

        var prev = curr.prev;

        if (prev != this){
            var newNode = new ReduceStream(this.reducer, value, this.extras);
            sever(prev, curr);
            connect(newNode, curr);
            connect(prev, newNode);
            return newNode.input;
        }
        else return this.unshift(value);
    };

    ReduceStream.prototype.remove = function(value){
        var curr = getNode.call(this, value);
        if (!curr) return;

        var prev = curr.prev;
        var next = curr.next;

        if (next){
            sever(curr, next);
            sever(prev, curr);
            connect(prev, next);

            this.output.set(0);
        }
        else this.pop();
    };

    function getNode(value){
        var node = this;
        while (node && node.value !== value)
            node = node.next;

        return node;
    }

    function sever(node1, node2){
        node1.next = null;
        node2.prev = null;
        node2.input.unsubscribe(node1.output)
    }

    function connect(node1, node2){
        node1.next = node2;
        node2.prev = node1;
        node2.input.subscribe(node1.output);
    }

    function setHeadOutput(output){
        this.headOutput.unsubscribe();
        this.headOutput.subscribe(output);
    }

    module.exports = ReduceStream;
}); 
