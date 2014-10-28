/*
 Copyright (c) 2014 Johann Muszynski

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:
 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.*/

/**
 * @namespace The parsers namespace provides utilities for parsing .OBJ, text csv point
 * clouds, and .PLY (binary and ASCII files )
 */

var parsers = ( function( module ) {

    function loadFile( file, onload ) {
        var request = new XMLHttpRequest();
        request.open( "GET", file, true );	//gets performed asynchronously
        request.responseType = "arraybuffer";
        request.onload = function ( e ) { onload( e.target.response ); };
        request.send();
    }

    /**
     * Get a line from a binary buffer. The newline character is not concatenated to the result.
     *
     * @param {Uint8Array} buffer
     * @param {Number} offset get line after an offset, specified in bytes*/
    function readLine( buffer, offset ) {
        var view = jDataView( buffer );
        if ( typeof(offset) === "undefined" ) {
            offset = 0;
        }
        view.seek( offset );
        var res = "";
        var ch = view.getChar();
        while ( ch != '\n' ) {
            res = res.concat( ch );
            ch = view.getChar();
        }
        return res;
    }

    ////////////////////////////////////////////////////////////////////////////////
    // PLY parser methods & prototypes
    ////////////////////////////////////////////////////////////////////////////////

    var byteSizePLY = {
        "char": 1,
        "uchar": 1,
        "short": 2,
        "ushort": 2,
        "int": 4,
        "uint": 4,
        "float": 4,
        "double": 8
    };

    var byteSymbolPLY = {
        "char": "c",
        "uchar": "B",
        "short": "h",
        "ushort": "H",
        "int": "i",
        "uint": "I",
        "float": "f",
        "double": "d"
    };

    var TokenStream = function() {
        this.tokenStream = [];
        this.index = 0;
        this.end = 0;
    };

    TokenStream.prototype.append = function( token ) {
        this.tokenStream.push( token );
        this.end++;
    };

    TokenStream.prototype.get = function() {
        var res = this.tokenStream[this.index];
        this.index++;
        if ( this.index >= this.end ) {
            this.index = this.end;
        }
        return res;
    };

    TokenStream.prototype.peek = function( count ) {
        if ( typeof(count) === "undefined" ) {
            count = 0;
        }
        if ( this.index + count == this.end ) {
            return this.tokenStream[this.end];
        }
        return this.tokenStream[this.index+count];
    };

    var PLYElementParser = function() {};

    var PLYBinaryElementParser = function() {
        //
    };

    var PLYScalarPropertyParser = function() {};

    var PLYBinaryScalarPropertyParser = function() {
        //
    };

    var PLYListPropertyParser = function() {};

    var PLYBinaryListPropertyParser = function() {
        //
    };

    /**
     * @param {Array} tokens the array of string tokens to be added to the token stream
     * @param {TokenStream} tokenStream
     * @returns {Boolean} false, if we reached the "end_header" token, true otherwise*/
    function tokenizePLYLine( tokens, tokenStream ) {
        for ( var i = 0; i < tokens.length; i++ ) {
            var token = tokens[i];
            if ( token === "ply" || token === "comment" ) {
                continue;
            }
            tokenStream.append( token );

            if ( token === "end_header" ) {
                return false;
            }
        }
        return true;
    }

    /**
     * Turn the PLY header into a stream of tokens.
     *
     * @param {Uint8Array} buffer
     * @returns {Array} the byte offset of the header, and the TokenStream object representing the header*/
    function tokenizePLYHeader( buffer ) {
        var offset = 0;
        var tokenStream = new TokenStream();
        // offset is length + 1 because the newline character is stripped from the result
        var line = readLine( buffer, 0 );
        offset += line.length + 1;
        var tokens = line.split(" ");
        while ( tokenizePLYLine( tokens, tokenStream ) ) {
            line = readLine( buffer, offset );
            offset += line.length + 1;
            tokens = line.split(" ");
        }

        return [ offset, tokenStream ];
    }

    function parsePLYHeader( tokenStream ) {
        var endianness = '';
        var resultDict = {};
        var elementParsers = [];
        while ( true ) {
            var token = tokenStream.get();
            if ( token === "format" ) {
                endianness = parseFormat( tokenStream );
            } else if ( token === "element" ) {
                elementParsers.append( parseElement(tokenStream, resultDict, endianness) );
            } else if ( token === "end_header" ) {
                break;
            }
        }
    }

    function parsePLYData() {}

    function parseFormat( tokenStream ) {}

    function parseElement( tokenStream, resultDict, endianness ) {}

    function parseProperty( tokenStream ) {}

    function parsePLY( file ) {
        var buffer = new Uint8Array( file );
        var tokenization = tokenizePLYHeader( buffer );
        var tokenStream = tokenization[1];
        var offset = tokenization[0];
        //parseHeader goes here
        console.log("The offset is " + offset );
        console.log("The tokens are: ");
        for ( var i = 0; i < tokenStream.end; i++ ) {
            console.log( tokenStream.get() );
        }
    }

    ////////////////////////////////////////////////////////////////////////////////
    // OBJ parser methods & prototypes
    ////////////////////////////////////////////////////////////////////////////////

    function parseOBJ( file ) {
        //
    }


    module.load = function( file, type, onload ) {
        //var parts = file.split('.');

        var loader = function( data ) {
            var model = parsePLY( data );

            if ( onload != undefined ) {
                onload( model );
            }
        };

        loadFile( file, loader );
    };

    return module;
}(  {} ) );