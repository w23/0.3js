var D3 = {};

D3.Exception = function (message) {
	this.name = 'D3.Exception';
	this.message = message;
}

D3.createContextOnCanvas = function (canvas) {
	if (canvas.__D3_context__) {
		return canvas.__D3_context__;
	}

	var gl = canvas.getContext('webgl');
	var context = {};
	var state = {
		buffers: {},
		program: null,
		attributes: {}
	};

	if (!gl) {
		throw {
			name: 'D3.NoGL',
			message: 'Cannot acquire WebGL context'
		};
	}

	D3.FLOAT32 = gl.FLOAT;
	D3.TRIANGLE_STRIP = gl.TRIANGLE_STRIP;

	state.viewport = [0, 0, canvas.width, canvas.height];
	gl.viewport(0, 0, canvas.width, canvas.height);

	var makeShader = function (source, type) {
		var shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			throw new D3.Exception(gl.getShaderInfoLog(shader));
		}

		return shader;
	}

	context.createProgram = function (sources) {
		var program = gl.createProgram();
		gl.attachShader(program, makeShader(sources.vertex, gl.VERTEX_SHADER));
		gl.attachShader(program, makeShader(sources.fragment, gl.FRAGMENT_SHADER));
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw {
				name: 'D3.ProgramLinkError',
				message: gl.getProgramInfoLog(program)
			};
		}

		return program;
	}

	var createBuffer = function (type) {
		var name = gl.createBuffer();
		var buffer = {};

		buffer.bind = function () {
			if (state.buffers[type] != this) {
				gl.bindBuffer(type, name);
				state.buffers[type] = this;
			}
		}

		var upload = function (that, data, usage) {
			that.bind();
			gl.bufferData(type, data, usage);
		}

		buffer.upload = function (data) {
			upload(this, data, gl.STATIC_DRAW);
			return this;
		}

		buffer.update = function (data) {
			upload(data, gl.DYNAMIC_DRAW);
			return this;
		}

		return buffer;
	}

	context.createVertexBuffer = function () {
		return createBuffer(gl.ARRAY_BUFFER);
	}

	context.createIndexBuffer = function () {
		return createBuffer(gl.ELEMENT_ARRAY_BUFFER);
	}

	context.setDestination = function (destdesc) {
		throw 'Not implemented';
	}
	
	context.setWrite = function (writedesc) {
		throw 'Not implemented';
	}

	context.fill = function (filldesc) {
		var color = filldesc.color;
		var depth = filldesc.depth;
		var bits = 0;
		if (color) {
			bits = gl.COLOR_BUFFER_BIT;
			gl.clearColor(color[0], color[1], color[2], color[3]);
		}
		if (depth) {
			bits |= gl.DEPTH_BUFFER_BIT;
			gl.clearDepth(depth);
		}
		if (bits !== 0) {
			gl.clear(bits);
		}
	}

	var bindUniform = function (name, uni) {
		throw 'Not implemented';
	}

	var bindAttribute = function (name, attr) {
		var index = gl.getAttribLocation(state.program, name);
		if (index < 0) {
			return;
		}

		gl.enableVertexAttribArray(index);
		attr.buffer.bind();
		gl.vertexAttribPointer(index, attr.size, attr.type, attr.normalized || false, attr.stride || 0, attr.offset);
		state.attributes[index] = true;
	}

	context.paint = function (paintdesc) {
		if (state.program !== paintdesc.program) {
			state.program = paintdesc.program;
			gl.useProgram(state.program);
		}

		if (paintdesc.uniforms) {
			for (uniform in paintdesc.uniforms) {
				if (paintdesc.uniforms.hasOwnProperty(uniform)) {
					bindUniform(uniform, paintdesc.uniforms[uniform]);
				}
			}
		}

		var oldattributes = state.attributes;
		state.attributes = {};
		for (attribute in paintdesc.attributes) {
			if (paintdesc.attributes.hasOwnProperty(attribute)) {
				bindAttribute(attribute, paintdesc.attributes[attribute]);
			}
		}
		for (attr in oldattributes) {
			if (oldattributes.hasOwnProperty(attr) && !(state.attributes[attr] && state.attributes.hasOwnProperty(attr))) {
				gl.disableVertexAttribArray(attr);
			}
		}

		if (paintdesc.index) {
			paintesc.index.buffer.bind();
			gl.drawElements(paintdesc.mode, paintesc.count, paintdesc.index.type || gl.UNSIGNED_SHORT, paintesc.index.offset || 0);
		} else {
			gl.drawArrays(paintdesc.mode, paintdesc.first || 0, paintdesc.count);
		}
	}

	canvas.__D3_context__ = context;
	return context;
}