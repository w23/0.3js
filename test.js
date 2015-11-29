function start() {
	var editor = ace.edit("editor");
    editor.setTheme("ace/theme/solarized_light");
    editor.getSession().setMode("ace/mode/glsl");

	try {
		var canvas = document.getElementById('glcanvas');
		var ctx = D3.createContextOnCanvas(canvas);
		var buffer = ctx.createVertexBuffer().upload(new Float32Array([1,-1,1,1,-1,-1,-1,1]));
		var vertex_source = 'attribute vec2 av2_vtx;varying vec2 vv2_v;void main(){vv2_v = av2_vtx;gl_Position = vec4(av2_vtx, 0., 1.);}';
	} catch (exc) {
		alert('This happened: ' + exc.message);
	}

	var renderer = (function () {
		var that = {};

		var program = null;

		var source = {
			program: program,
			attributes: {
				'av2_vtx': {
					buffer: buffer,
					size: 2,
					type: ctx.AttribType.Float,
					offset: 0
				}
			},
			uniforms: {},
			mode: ctx.Primitive.TriangleStrip,
			count: 4
		};

		that.updateSource = function (fragment_source) {
			var new_program = ctx.createProgram({
				vertex: vertex_source,
				fragment: fragment_source
			});
			source.program = new_program;

			var unimatch = /^\s*uniform\s+(float|vec2|vec3|vec4)\s+([a-zA-Z]*[-_a-zA-Z0-9]).*\/\/(slide|color)({.*})/gm;
			var uniforms = [];

			for (;;) {
				uniform = unimatch.exec(fragment_source);
				if (!uniform) {
					break;
				}

				try {
					uniforms.push({
						type: uniform[1],
						name: uniform[2],
						kind: uniform[3],
						settings: JSON.parse(uniform[4])
					});
				} catch (e) {
					console.log(e);
				}
			}

			return uniforms;
		}

		that.render = function (time, frame, resolution, destination) {
			source.uniforms['us2_frame'] = ctx.UniformSampler(frame);
			source.uniforms['uv2_resolution'] = ctx.UniformVec2(resolution);
			source.uniforms['uf_time'] = ctx.UniformFloat(time);
			ctx.rasterize(source, null, destination);
		}

		return that;
	})();

	var presenter = (function () {
		var that = {};

		var src = 'precision mediump float;\n';
			src += 'uniform sampler2D us2_source;\n';
			src += 'uniform float uf_time;\n';
			src += 'uniform vec2 uv2_resolution;\n';
			src += 'void main() {\n';
			src += '\tgl_FragColor = \n';
			//vec4(gl_FragCoord.xy / uv2_resolution, sin(uf_time), 1.);\n';
			src += '\t\ttexture2D(us2_source, gl_FragCoord.xy / uv2_resolution);\n';
			src += '}\n';

		var program = ctx.createProgram({
			vertex: vertex_source,
			fragment: src
		});

		var source = {
			program: program,
			attributes: {
				'av2_vtx': {
					buffer: buffer,
					size: 2,
					type: ctx.AttribType.Float,
					offset: 0
				}
			},
			uniforms: {
				'us2_source': ctx.UniformSampler(texture)
			},
			mode: ctx.Primitive.TriangleStrip,
			count: 4
		};

		var resolution = null;
		var texture = null;
		var framebuffer = null;
		var writepos = 0;

		that.present = function (time) {
			if (!resolution) {
				return;
			}

			writepos = (writepos + 1) & 1;

			source.uniforms['uf_time'] = ctx.UniformFloat(time);
			source.uniforms['uv2_resolution'] = ctx.UniformVec2(resolution);
			source.uniforms['us2_source'] = ctx.UniformSampler(texture[writepos]);
			ctx.rasterize(source);
		};


		that.setResolution = function (w, h) {
			if (!resolution) {
				texture = [
					ctx.createTexture().uploadEmpty(ctx.TextureFormat.RGBA_8, w, h),
					ctx.createTexture().uploadEmpty(ctx.TextureFormat.RGBA_8, w, h)
				];
				framebuffer = [
					ctx.createFramebuffer().attachColor(texture[1]),
					ctx.createFramebuffer().attachColor(texture[0])
				];
			} else if (resolution[0] !== w || resolution[1] !== h) {
				texture[0].uploadEmpty(ctx.TextureFormat.RGBA_8, w, h);
				texture[1].uploadEmpty(ctx.TextureFormat.RGBA_8, w, h);
			}

			resolution = [w, h];
		}

		that.getPreviousFrame = function () {
			return texture[writepos];
		}

		that.getResolution = function () {
			return resolution;
		}

		that.getDestination = function () {
			return { framebuffer: framebuffer[writepos] };
		}

		return that;
	})();

	var controls = (function () {
		var that = {};
		var section = document.getElementById('controls');

		var controls = [];

		var createSlider = function (name, id, limits) {
			var label = document.createElement("label");
			label.setAttribute('id', id);
			label.innerHTML = name;

			var input = document.createElement("input");
			label.setAttribute('id', id + ':input');
			input.setAttribute('type', 'range');
			input.setAttribute('value', limits['default']);
			input.setAttribute('min', limits['min']);
			input.setAttribute('max', limits['max']);
			input.setAttribute('step', limits['step']);
			input.addEventListener('input', function (){
				console.log(id, input.value);
			});
			label.appendChild(input);
			return label;
		}

		var createFieldset = function (label, id, children) {
			var fieldset = document.createElement('fieldset');
			fieldset.setAttribute('id', id);
			fieldset.innerHTML = "<legend>" + label + "</legend>";

			for (var i = 0; i < children.length; i += 1) {
				fieldset.appendChild(children[i]);
			}
			return fieldset;
		}

		var createColor = function (name, id) {
			var label = document.createElement("label");
			label.setAttribute('id', id);
			label.innerHTML = name;

			var input = document.createElement("input");
			label.setAttribute('id', id + ':input');
			label.setAttribute('type', 'color');
			label.appendChild(input);
			return label;
		}

		var createElement = function (id, uni) {
			switch (uni.type) {
				case 'float':
					return createSlider(uni.name, id, uni.settings);
				case 'vec2':
					var sliders = [
						createSlider("X/R", id + ':X', uni.settings),
						createSlider("Y/G", id + ':Y', uni.settings)
					];
					return createFieldset(uni.name, id, sliders);
				case 'vec3':
					if (uni.kind === 'color') {
						return createColor(uni.name, id, uni.settings);
					} else {
						var sliders = [
							createSlider("X/R", id + ':X', uni.settings),
							createSlider("Y/G", id + ':Y', uni.settings),
							createSlider("Z/B", id + ':Z', uni.settings)
						];
						return createFieldset(uni.name, id, sliders);
					}
				case 'vec4':
					var sliders = [
						createSlider("X/R", id + ':X', uni.settings),
						createSlider("Y/G", id + ':X', uni.settings),
						createSlider("Z/B", id + ':Z', uni.settings),
						createSlider("W/A", id + ':W', uni.settings)
					];
					return createFieldset(uni.name, id, sliders);
					
				default: throw 'wat';
			}
		}

		var updateControl = function (ctl, uni) {
			if (!ctl.name) {
				ctl.name = uni.name;
				ctl.element = createElement('CTL:' + ctl.name, uni);
				section.appendChild(ctl.element);
			}
		}

		var deleteControl = function (ctl) {
			section.removeChild(ctl.element);
		}

		that.updateControls = function (uniforms) {
			var newcontrols = [];
			var ctl, uni;
			for (var i = 0; i < uniforms.length; i += 1) {
				uni = uniforms[i];
				ctl = null;
				for (var j = 0; j < controls.length; j += 1) {
					if (controls[j].name === uni.name) {
						ctl = controls[j];
						newcontrols.push(ctl);
						controls.splice(j, 1);
						break;
					}
				}
				if (!ctl) {
					ctl = {}
					newcontrols.push(ctl);
				}
				updateControl(ctl, uni);
			}

			for (var i = 0; i < controls.length; i += 1) {
				deleteControl(controls[i]);
			}

			controls = newcontrols;
		}

		return that;
	})();

	var sourceUpdated = function () {
		var uniforms;
		try {
			uniforms = renderer.updateSource(editor.getValue());
			controls.updateControls(uniforms);
		} catch (except) {
			console.log(except);
		}
	}

	editor.getSession().on('change', sourceUpdated);

	sourceUpdated();

	var starttime = null;

	var paint = function paint() {
		try {
			var time = Date.now()
			if (starttime === null) {
				starttime = time;
			}
			time = (time - starttime) * 0.001;

			if (canvas.clientWidth !== canvas.width ||
				canvas.clientHeight !== canvas.height) {

				var pixelFactor = /*window.devicePixelRatio ||*/ 1;

				canvas.width = canvas.clientWidth * pixelFactor;
				canvas.height = canvas.clientHeight * pixelFactor;

				presenter.setResolution(canvas.width, canvas.height);
			}

			renderer.render(time,
				presenter.getPreviousFrame(),
				presenter.getResolution(),
				presenter.getDestination());

			presenter.present(time);

			requestAnimationFrame(paint);
		} catch(e) {
			console.log(e);
		}
	}

	paint();
}