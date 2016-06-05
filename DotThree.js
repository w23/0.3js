; (function(factory) {
	'use strict';

	var DotThree = function() {}

	DotThree.Exception = function (message) {
		this.name = 'DotThree.Exception';
		this.message = message;
	}

	DotThree.prototype.createContextOnCanvas = function(canvas, attributes) {
		/** @todo attributes defaults and overrides */

		var gl = canvas.getContext('webgl', attributes);
		if (!gl) {
			throw new DotThree.Exception('WebGL is not available');
		}

		return new Context(gl, canvas);
	} // DotThree.prototype.createContextOnCanvas = function(canvas, attributes)

	var Context = function(gl, canvas) {
		this._dot_three_private = {}

		var self = this;
		var pub = this;
		var priv = this._dot_three_private;

		// Internal state to optimize gl state changes
		var state = {
			buffers: {},
			program: null,
			attributes: {},
			samplers: [],
			active_sampler_unit: 0
		};

		var limits = {
			/** @todo max_sampler_size, ... */
			sampler_units: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)
		};

		priv.gl = gl;
		priv.canvas = canvas;
		priv.state = state;
		priv.limits = limits;

		pub.AttribType = {
			Byte: gl.BYTE,
			Short: gl.SHORT,
			UnsignedByte: gl.UNSIGNED_BYTE,
			UnsignedShort: gl.UNSIGNED_SHORT,
			Fixed: gl.FIXED,
			Float: gl.FLOAT
		};

		pub.Primitive = {
			Points: gl.POINTS,
			Lines: gl.LINES,
			LineStrip: gl.LINE_STRIP,
			LineLoop: gl.LINE_LOOP,
			Triangles: gl.TRIANGLES,
			TriangleStrip: gl.TRIANGLE_STRIP,
			TriangleFan: gl.TRIANGLE_FAN
		};

		pub.SampleFormat = {
			R_8: {format: gl.LUMINANCE, type: gl.UNSIGNED_BYTE},
			RA_8: {format: gl.LUMINANCE_ALPHA, type: gl.UNSIGNED_BYTE},
			RGB_8: {format: gl.RGB, type: gl.UNSIGNED_BYTE},
			RGBA_8: {format: gl.RGBA, type: gl.UNSIGNED_BYTE},
			RGB_565: {format: gl.RGB, type: gl.UNSIGNED_SHORT_5_6_5},
			RGBA_5551: {format: gl.RGBA, type: gl.UNSIGNED_SHORT_5_5_5_1},
			RGBA_4444: {format: gl.RGBA, type: gl.UNSIGNED_SHORT_4_4_4_4}
		};

		priv.state.samplers[limits.sampler_units - 1] = null;

		priv.doFill = function (filldesc) {
			var color = filldesc.color;
			var depth = filldesc.depth;
			var bits = 0;
			if (color) {
				bits |= gl.COLOR_BUFFER_BIT;
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

		priv.shaderCompile = function (source, type) {
			var shader = gl.createShader(type);
			gl.shaderSource(shader, source);
			gl.compileShader(shader);

			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				throw new DotThree.Exception(gl.getShaderInfoLog(shader));
			}

			return shader;
		} // priv.shaderCompile = function

		priv.bufferBind = function (buffer, type, name) {
			if (state.buffers[type] !== buffer) {
				gl.bindBuffer(type, name);
				state.buffers[type] = buffer;
			}
		}

		priv.samplerBind = function (sampler, type, name) {
			/// @todo untangle this mess. there are just a few sampler bind scenarios. what are they?
			if (state.samplers[state.active_sampler_unit] !== sampler) {
				// notify previous slot occupant that it's no longer there
				if (state.samplers[state.active_sampler_unit]) {
					state.samplers[state.active_sampler_unit]._dot_three_private.bound_unit = null;
				}
				gl.bindSampler(type, name);
				state.samplers[state.active_sampler_unit] = sampler;
				sampler._dot_three_private.bound_unit = state.active_sampler_unit;
			}
		}

		priv.setupDestination = function (dest) {
			if (dest) {
				if (dest.framebuffer) {
					dest.framebuffer.use();
					if (!dest.viewport) {
						gl.viewport(0, 0,
							dest.framebuffer.getWidth(), dest.framebuffer.getHeight());
					}
				}
				if (dest.viewport) {
					gl.viewport.apply(gl, dest.viewport);
				}
			} else {
				if (state.framebuffer) {
					gl.bindFramebuffer(gl.FRAMEBUFFER, null);
					state.framebuffer = null;
				}
				gl.viewport(0, 0, canvas.width, canvas.height);
			}
			return this;
		} // priv.setupDestination = function (dest) {

	/** @todo
			var bindUniform = function (name, uni) {
				var loc = gl.getUniformLocation(state.program, name);
				if (loc) {
					uni(loc);
				}
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

			var do_paint = function (paintdesc) {
				if (state.program !== paintdesc.program) {
					state.program = paintdesc.program;
					gl.useProgram(state.program);
				}

				for (var i = 0; i < state.samplers.length; i += 1) {
					if (state.samplers[i]) {
						gl.activeSampler(gl.TEXTURE0 + i);
						state.active_sampler = i;
						gl.bindSampler(gl.TEXTURE_2D, null);
						state.samplers[i] = null;
					}
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
		*/
	} // Context = function(gl, canvas)

	Context.prototype.createProgram = function (sources) {
		var priv = this._dot_three_private;
		var gl = priv.gl;

		var program = gl.createProgram();
		gl.attachShader(program, priv.makeShader(sources.vertex, gl.VERTEX_SHADER));
		gl.attachShader(program, priv.makeShader(sources.fragment, gl.FRAGMENT_SHADER));
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw new DotThree.Exception(gl.getProgramInfoLog(program));
		}

		return program;
	} // Context.prototype.createProgram = function

	Context.prototype.createVertexBuffer = function () {
		var priv = this._dot_three_private;
		return new Buffer(this, priv.gl.ARRAY_BUFFER);
	};

	Context.prototype.createIndexBuffer = function () {
		var priv = this._dot_three_private;
		return new Buffer(this, priv.gl.ELEMENT_ARRAY_BUFFER);
	};

	Context.prototype.fill = function (params, destination) {
		this._dot_three_private.setupDestination(destination).doFill(params);
		return this;
	} // Context.prototype.fill = function (params, destination)

/** @todo rasterize
	Context.prototype.rasterize = function(source, operation, destination) {
		this._dot_three_private
			.setupDestination(destination)
			.setupOperation(operation)
			.doRasterize(source);
		return this;
	} // Context.prototype.rasterize = function(source, operation, destination)
*/

/** @todo buffer objects
	var Buffer = function(context, type) {
		this._dot_three_private = {}
		var priv = this._dot_three_private;

		priv.context = context;
		priv.name = gl.createBuffer();
		priv.type = type;
		priv.usage = null;
	}

	Buffer.prototype.upload = function (data, usage) {
		var priv = this._dot_three_private;
		var context = priv.context;

		/// @todo validate data
		/// @todo validate usage
		if (!usage) {
			usage = gl.STATIC_DRAW;
		}

		context.bufferBind(this, priv.type, priv.name);
		context._dot_three_private.gl.bufferData(private.type, data, usage);

		priv.usage = usage;
		return this;
	} // Buffer.prototype.upload = function (data, usage)

	Buffer.prototype.update = function (data) {
		return this.upload(data, gl.DYNAMIC_DRAW);
	}
*/

/** @todo samplers
	var Sampler = function(context, type) {
		this._dot_three_private = {}
		var priv = this._dot_three_private;

		priv.context = context;
		priv.name = gl.createSampler();
		priv.type = type;
		priv.width = 0;
		priv.height = 0;
		priv.bound_unit = null;
	} // var Sampler = function(context, type)

	Sampler.prototype.getWidth = function() {
		return this._dot_three_private.width;
	}

	Sampler.prototype.getHeight = function() {
		return this._dot_three_private.height;
	}

	Sampler.prototype.upload = function() {
		tex.bind.apply(this);

		tex.uploadEmpty = function (format, width_in, height_in) {
			this.bind();
			width = width_in;
			height = height_in;
			gl.texImage2D(gl.TEXTURE_2D, 0, format.format,
				width, height, 0, format.format, format.type, null);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);//LINEAR_MIPMAP_NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			return this;
		}

		tex.uploadImage = function (image) {
			this.bind();
			gl.texImage2D(gl.TEXTURE_2D, 0, format.format, format.format, format.type, image);
			width = image.naturalWidth;
			height = image.naturalHeight;
			return this;
		}

		tex.generateMipmap = function () {
			this.bind();
			gl.generateMipmap(gl.TEXTURE_2D);
			return this;
		}

		return tex;
	} // var Sampler = function(context)

	Context.prototype.createSampler = function () {
		return new Sampler(this, this._dot_three_private.gl.TEXTURE_2D);
	}
*/

/** @todo framebuffers
	var Framebuffer = function(context) {
	} // var Framebuffer = function(context)

	Context.prototype.createFramebuffer = function () {
		return new Framebuffer(this);
	}

	context.createFramebuffer = function () {
		var name = gl.createFramebuffer();
		var that = {};

		var sampler = null;
		var depth = null;

		that.getWidth = function () {
			return sampler.getWidth();
		}

		that.getHeight = function () {
			return sampler.getHeight();
		}

		that.attachColor = function (sampler_in) {
			if (sampler) { throw new DotThree.Exception('Invalid argument'); }
			sampler = sampler_in;

			this.bind();
			gl.framebufferSampler2D(gl.FRAMEBUFFER,
				gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sampler.getName(), 0);

			return this;
		}

		that.attachDepth = function () {
			depth = {
				name: gl.createRenderbuffer(),
				width: 0,
				height: 0
			};
			return this;
		}

		that.bind = function () {
			if (state.framebuffer !== this) {
				gl.bindFramebuffer(gl.FRAMEBUFFER, name);
				state.framebuffer = this;
			}
		}

		that.use = function () {
			this.bind();

			if (depth) {
				if (depth.width != sampler.getWidth() || depth.height != sampler.getHeight()) {
					gl.bindRenderbuffer(gl.RENDERBUFFER);
					gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
						sampler.getWidth(), sampler.getHeight());
					depth.width = sampler.getWidth();
					depth.height = sampler.getHeight();
					gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER);
				}
			}

			var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
			if (status !== gl.FRAMEBUFFER_COMPLETE) {
				throw new DotThree.Exception('Framebuffer incomplete');
			}
		}

		return that;
	}
*/

/** @todo lightweight uniforms
	context.prototype.UniformFloat = function (value) {
		var gl = this._dot_three_private.gl;
		return function (loc) {
			gl.uniform1f(loc, value);
		}
	}

	context.prototype.UniformVec2 = function (value) {
		var gl = this._dot_three_private.gl;
		return function (loc) {
			gl.uniform2fv(loc, value);
		}
	}

	context.prototype.UniformVec3 = function (value) {
		var gl = this._dot_three_private.gl;
		return function (loc) {
			gl.uniform3fv(loc, value);
		}
	}

	context.prototype.UniformVec4 = function (value) {
		var gl = this._dot_three_private.gl;
		return function (loc) {
			gl.uniform4fv(loc, value);
		}
	}

	context.prototype.UniformSampler = function (sampler) {
		return function (loc) {
			var unit = undefined;
			for (var i = 0; i < state.samplers.length; i += 1) {
				if (state.samplers[i] === sampler) {
					unit = i;
					break;
				}
			}
			if (unit === undefined) {
				for (var i = 0; i < state.samplers.length; i += 1) {
					if (!state.samplers[i]) {
						gl.activeTexture(gl.TEXTURE0 + i);
						state.active_sampler = i;
						sampler.bind();
						unit = i;
						break;
					}
				}
				if (unit === undefined) {
					throw new DotThree.Exception('Too many samplers bound');
				}
			}
			gl.uniform1i(loc, unit);
		}
	}
*/

	factory.DotThree = new DotThree();
})(this); // (function(factory) {
