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
 * @namespace The morphoviewer.io namespace provides utilities for parsing .OBJ, text csv point
 * clouds, and .PLY (binary and ASCII files )
 */

var morphoviewer = ( function( module ) {

    module.io = {};

    function loadFile( file, onload ) {
        var request = new XMLHttpRequest();
        request.open( "GET", file, true );	//gets performed asynchronously
        request.responseType = "arraybuffer";
        request.onload = function ( e ) { onload( e.target.response ); };
        request.send();
    }

    /**
     * @class A static wrapper for a jDataView.
     * */
    function BufferView( buffer, offset, littleEndian ) {
        if ( typeof(littleEndian) === "undefined" ) {
            littleEndian = false;
        }
        if ( typeof(offset) === "undefined" ) {
            offset = 0;
        }
        arguments.callee.buffer = buffer;
        arguments.callee.view = jDataView( buffer, offset, buffer.length - offset, littleEndian );
    }

    /**
     * If reading binary data, set the correct endianness.*/
    BufferView.isLittleEndian = function( littleEndian ) {
        var offset = BufferView.view.tell();
        var length = BufferView.buffer.length;
        BufferView.view = jDataView( BufferView.buffer, offset, length - offset, littleEndian );
    };

    BufferView.tell = function() { return BufferView.view.tell(); };

    BufferView.end = function() { return BufferView.buffer.length; };

    BufferView.getChar = function() {
        return BufferView.view.getChar();
    };

    BufferView.getInt8 = function() {
        return BufferView.view.getInt8();
    };

    BufferView.getUint8 = function() {
        return BufferView.view.getUint8();
    };

    BufferView.getInt16 = function() {
        return BufferView.view.getInt16();
    };

    BufferView.getUint16 = function() {
        return BufferView.view.getUint16();
    };

    BufferView.getInt32 = function() {
        return BufferView.view.getInt32();
    };

    BufferView.getUint32 = function() {
        return BufferView.view.getUint32();
    };

    BufferView.getFloat32 = function() {
        return BufferView.view.getFloat32();
    };

    BufferView.getFloat64 = function() {
        return BufferView.view.getFloat64();
    };

    /**
     * @returns {String} the line, without the newline character*/
    BufferView.readLine = function() {
        var res = "";
        var ch = BufferView.getChar();
        while ( ch != '\n' ) {
            res = res.concat( ch );
            ch = BufferView.getChar();
        }
        return res;
    };

    /**
     * Peek at the next char in the buffer
     * */
    BufferView.peekChar = function() {
        var pos = BufferView.view.tell();
        var c = BufferView.view.getChar();
        BufferView.view.seek( pos );
        return c;
    };

    /**
     * This function is meant for reading one word at a time, without spaces or newlines.
     *
     * @returns {String} a string representing single word on the line*/
    BufferView.readToken = function() {
        if ( BufferView.view.tell() >= BufferView.buffer.length ) {
            console.log("BufferView.readToken: position: " + BufferView.view.tell() + ", length: " + BufferView.buffer.length );
            throw "BufferView.readToken: current position out of file bounds";
        }
        var res = [];
        var ch;
        //eat the newlines and spaces away
        while ( true ) {
            ch = BufferView.peekChar();
            if ( ch == '\n' || ch == ' ') {
                BufferView.getChar();
            } else {
                break;
            }
        }
        while ( true ) {
            ch = BufferView.peekChar();
            if ( ch == '\n' || ch == ' ' ) {
                break;
            } else {
                res.push( BufferView.getChar() );
            }
        }
        return res.join("");
    };

    ////////////////////////////////////////////////////////////////////////////////
    // PLY parser methods & prototypes
    ////////////////////////////////////////////////////////////////////////////////

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

    var plyTypeToBufferView = {
        "char": BufferView.getChar,
        "uchar": BufferView.getUint8,
        "short": BufferView.getInt16,
        "ushort": BufferView.getUint16,
        "int": BufferView.getInt32,
        "uint": BufferView.getUint32,
        "float": BufferView.getFloat32,
        "double": BufferView.getFloat64
    };

    var plyTypeToParseString = {
        "char": parseInt,
        "uchar": parseInt,
        "short": parseInt,
        "ushort": parseInt,
        "int": parseInt,
        "uint": parseInt,
        "float": parseFloat,
        "double": parseFloat
    };

    var PLYElementParser = function( count ) {
        this.count = count;
        this.propertyParsers = [];
    };

    /**
     * */
    PLYElementParser.prototype.parseElement = function() {
        for ( var i = 0; i < this.count; i++ ) {
            for ( var j = 0; j < this.propertyParsers.length; j++ ) {
                this.propertyParsers[j].parse();
            }
        }
    };

    PLYElementParser.prototype.append = function( parser ) {
        this.propertyParsers.push( parser );
    };

    var PLYBinaryScalarPropertyParser = function( target, type ) {
        this.target = target;
        this.getter = plyTypeToBufferView[type];

    };

    /**
     * */
    PLYBinaryScalarPropertyParser.prototype.parse = function() {
        this.target.push(this.getter());
    };

    var PLYAsciiScalarPropertyParser = function( target, type ) {
        this.target = target;
        this.parser = plyTypeToParseString[type];
    };

    PLYAsciiScalarPropertyParser.prototype.parse = function() {
        var token = BufferView.readToken();
        this.target.push( this.parser(token) );
    };

    var PLYBinaryListPropertyParser = function( target, numeratorType, listType ) {
        this.target = target;
        this.numeratorGetter = plyTypeToBufferView[numeratorType];
        this.listGetter = plyTypeToBufferView[listType];
    };

    PLYBinaryListPropertyParser.prototype.parse = function() {
        var count = this.numeratorGetter();
        var result = [];
        for ( var i = 0; i < count; i++ ) {
            result.push( this.listGetter() );
        }
        this.target.push(result);
    };

    var PLYAsciiListPropertyParser = function( target, numeratorType, listType ) {
        this.target = target;
        this.numeratorParser = plyTypeToParseString[numeratorType];
        this.listParser = plyTypeToParseString[listType];
    };

    PLYAsciiListPropertyParser.prototype.parse = function() {
        var token = BufferView.readToken();
        var number = this.numeratorParser( token );
        var result = [];
        for ( var i = 0; i < number; i++ ) {
            token = BufferView.readToken();
            result.push( this.listParser(token) );
        }
        this.target.push( result );
    };

    /**
     * Appends a line of tokens to a TokenStream object. The "ply" and "comment" tokens
     * are not appended.
     *
     * @param {Array} tokens the array of string tokens to be added to the token stream
     * @param {Object} tokenStream a TokenStream object
     * @returns {Boolean} true, if we reached the "end_header" token, false otherwise
     * */
    function tokenizePLYLine( tokens, tokenStream ) {
        for ( var i = 0; i < tokens.length; i++ ) {
            var token = tokens[i];
            tokenStream.append( token );

            if ( token === "end_header" ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Turn the PLY header into a stream of tokens.
     *
     * @returns {Object} the TokenStream object representing the header
     * */
    function tokenizePLYHeader() {
        var tokenStream = new TokenStream();
        while ( true ) {
            var line = BufferView.readLine();
            var tokens = line.split(" ");
            var token = tokens[0];
            if ( token === "ply" || token === "comment" ) {
                continue;
            }
            if ( tokenizePLYLine( tokens, tokenStream ) ) {
                break;
            }
        }

        return tokenStream;
    }

    /**
     * @returns {Array} an array of element parsers, the result dictionary, and the format string
     * */
    function parsePLYHeader() {
        var tokenStream = tokenizePLYHeader();

        var resultDict = {};
        var elementParsers = [];
        var format = "";
        while ( true ) {
            var token = tokenStream.get();
            if ( token === "format" ) {
                format = parseFormat( tokenStream );
            } else if ( token === "element" ) {
                elementParsers.push( parseElement(tokenStream, resultDict, format ) );
            } else if ( token === "end_header" ) {
                break;
            }
        }
        return [ elementParsers, resultDict, format ];
    }

    /**
     * Parse the entire data section of the file, depositing the results in the result dictionary.
     * */
    function parsePLYData( elementParsers ) {
        for ( var i = 0; i < elementParsers.length; i++ ) {
            elementParsers[i].parseElement();
        }
    }

    /**
     * @param {Object} tokenStream a TokenStream object
     * @returns {String} 'ascii', 'little', 'big'*/
    function parseFormat( tokenStream ) {
        var token = tokenStream.get();
        var result = "";
        if ( token === "ascii" ) {
            result = "ascii";
        } else if ( token === "binary_little_endian" ) {
            result = "little";
        } else if ( token === "binary_big_endian" ) {
            result = "big";
        }
        //get rid of version number
        tokenStream.get();
        return result;
    }

    /**
     * @returns {Object} a PLYElementParser object*/
    function parseElement( tokenStream, resultDict, format ) {
        //element has already been consumed, the name is next
        var name = tokenStream.get();
        resultDict[name] = {};
        var number = tokenStream.get();
        var elementParser = new PLYElementParser( parseInt(number) );
        while ( tokenStream.peek() === "property" ) {
            elementParser.append( parseProperty( tokenStream, resultDict[name], format ) );
        }
        return elementParser;
    }

    /**
     * @returns {Object} returns an object of type PLY*PropertyParser */
    function parseProperty( tokenStream, target, format ) {
        //get rid of the property token
        tokenStream.get();
        //declare our property parser
        var parser;
        if ( tokenStream.peek() === "list" ) {
            //get rid of the list token
            tokenStream.get();
            var numeratorType = tokenStream.get();
            var listType = tokenStream.get();
            var listName = tokenStream.get();
            target[listName] = [];
            if ( format === "ascii" ) {
                parser = new PLYAsciiListPropertyParser( target[listName], numeratorType, listType );
            } else if ( format === "little" || format === "big" ) {
                parser = new PLYBinaryListPropertyParser( target[listName], numeratorType, listType );
            }
        } else {
            var propertyType = tokenStream.get();
            var propertyName = tokenStream.get();
            target[propertyName] = [];
            if ( format === "ascii" ) {
                parser = new PLYAsciiScalarPropertyParser( target[propertyName], propertyType );
            } else if ( format === "little" || format === "big" ) {
                parser = new PLYBinaryScalarPropertyParser( target[propertyName], propertyType );
            }
        }
        return parser;
    }

    /**
     * @returns {Object} An object, where each element is represented by a named object, and each
     * property by a named array within the object. */
    module.io.loadPLY = function( file, onload ) {
        var loader = function( data ) {
            var buffer = new Uint8Array( data );
            BufferView(buffer);
            var parseData = parsePLYHeader();
            var elementParsers = parseData[0];
            var model = parseData[1];
            var format = parseData[2];

            if (format != "ascii") {
                //set as default of jDataview
                var littleEndian = false;
                if (format === "little") {
                    littleEndian = true;
                }
                BufferView.isLittleEndian(littleEndian);
            }
            parsePLYData(elementParsers);

            if ( typeof(onload) != "undefined" ) {
                onload( model );
            }

        };

        loadFile( file, loader );
    };

    ////////////////////////////////////////////////////////////////////////////////
    // OBJ parser methods & prototypes
    ////////////////////////////////////////////////////////////////////////////////

    function parseOBJ() {
        var target = { "v": [], "f": [] };
        while ( BufferView.tell() < BufferView.end() ) {
            var line = BufferView.readLine();
            var tokens = line.split(" ");

            var verts = target["v"];
            var tris = target["f"];

            if ( tokens[0] == "v" ) {
                verts.push([
                    parseFloat( tokens[1] ),
                    parseFloat( tokens[2] ),
                    parseFloat( tokens[3] )
                ]);
            }
            var hasNormals = false;
            var norms = target["vn"];//undefined if there are no normals
            if ( tokens[0] == "vn" ) {
                if ( !hasNormals ) {
                    target["vn"] = [];
                    norms = target["vn"];
                    hasNormals = true;
                }
                norms.push([
                    parseFloat( tokens[1] ),
                    parseFloat( tokens[2] ),
                    parseFloat( tokens[3] )
                ]);
            }
            if ( tokens[0] == "f" ) {
                var tri = [];
                var ind1 = parseInt( tokens[1] ) - 1;
                for ( var i = 2; i < tokens.length; i += 2 ) {
                    var ind2 = parseInt( tokens[i] ) - 1;
                    var ind3 = parseInt( tokens[i+1] ) - 1;
                    tri.push( ind1, ind2, ind3 );
                }
                tris.push( tri );
            }
        }
        return target;
    }

    module.io.loadOBJ = function( file, onload ) {
        var loader = function( data ) {
            var buffer = new Uint8Array( data );
            BufferView( buffer );
            var model = parseOBJ();

            if ( typeof(onload) != "undefined" ) {
                onload( model );
            }
        };
        loadFile( file, loader );
    };

    ////////////////////////////////////////////////////////////////////////////////
    // CSV point cloud parser methods & prototypes
    ////////////////////////////////////////////////////////////////////////////////

    function parseCSV( delimiter ) {
        var model = { "points": [] };
        var points = model["points"];
        while ( BufferView.tell() < BufferView.end() ) {
            var line = BufferView.readLine();
            var tokens = line.split( delimiter );
            points.push([
                parseFloat( tokens[0] ),
                parseFloat( tokens[1] ),
                parseFloat( tokens[2] )
            ]);
        }
        return model;
    }

    /**
     * @param {String} file the name of the file to be loaded
     * @param {Function} onload the function to be executed once the file has been received
     * @param {String} delimiter the separator used in the file, set to comma by default */
    module.io.loadCSV = function( file, onload, delimiter ) {
        if ( typeof(delimiter) !== "undefined" ) {
            delimiter = ",";
        }
        var loader  =function( data ) {
            var buffer = new Uint8Array( data );
            BufferView( buffer );
            var model = parseCSV( delimiter );

            if ( typeof(onload) != "undefined" ) {
                onload( model );
            }
        };
        loadFile( file, loader );
    };

    module.io.load = function( file, type, onload ) {

        /**/
    };

    return module;
}(  morphoviewer || {} ) );