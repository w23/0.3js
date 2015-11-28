function start() {
	var editor = ace.edit("editor");
    editor.setTheme("ace/theme/solarized_light");
    editor.getSession().setMode("ace/mode/glsl");
    /*editor.setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: false
    });*/

	try {
		var canvas = document.getElementById('glcanvas');
		var ctx = D3.createContextOnCanvas(canvas);

		var buffer = ctx.createVertexBuffer().upload(new Float32Array([1,-1,1,1,-1,-1,-1,1]));

		var vertex_source = 'attribute vec2 av2_vtx;varying vec2 vv2_v;void main(){vv2_v = av2_vtx;gl_Position = vec4(av2_vtx, 0., 1.);}';

		var program = ctx.createProgram({
			vertex: vertex_source,
			fragment: editor.getValue()
		});

		var texture = ctx.createTexture()
			.uploadEmpty(ctx.TextureFormat.RGBA_8, canvas.width, canvas.height);
		
		var fb = ctx.createFramebuffer()
			.attachColor(texture);

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

		var present = (function () {
			var src = 'precision mediump float;\n';
			src += 'uniform sampler2D us2_source;\n';
			//src += 'uniform float uf_time;\n';
			src += 'uniform vec2 uv2_resolution;\n';
			src += 'void main() {\n';
			//src += '\tfloat c = mod(gl_FragCoord.x, 2.)*mod(gl_FragCoord.y, 2.);\n';
			src += '\tgl_FragColor = \n';
			//src += 'mix('
			//src += '\t\tvec4(c, c, c, 1.),'//;\n';
			src += '\t\ttexture2D(us2_source, gl_FragCoord.xy / uv2_resolution);\n'//, sin(uf_time*10.)*.5+.5);\n';
			//src += '\t\ttexture2D(us2_source, vv2_v * .5 - .5);\n';
			//src += '\t\tvec4(gl_FragCoord.xy / uv2_resolution, 0., 1.);\n';
			//src += '\t\tvec4(vv2_v * .5 + .5 - gl_FragCoord.xy / uv2_resolution, 0., 1.);\n';
			//src += '\t\tvec4(length(vv2_v * .5 + .5 - gl_FragCoord.xy / uv2_resolution), 0., 0., 1.);\n';
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

			return function (time) {
				source.uniforms['uf_time'] = ctx.UniformFloat(time);
				source.uniforms['uv2_resolution'] = ctx.UniformVec2([
					canvas.clientWidth, canvas.clientHeight]);
				ctx.rasterize(source);
			};
		})();

		var dest = {
			framebuffer: fb
		};

		editor.getSession().on('change', function(e) {
			try {
				source.program = ctx.createProgram({
					vertex: vertex_source,
					fragment: editor.getValue()
				});
			} catch (except) {
				console.log(except);
			}
		});

		var starttime = Date.now();

		paint = function paint() {
			try {
				var time = (Date.now() - starttime) * 0.001;

				if (canvas.clientWidth != texture.getWidth() ||
					canvas.clientHeight != texture.getHeight()) {

					canvas.width = canvas.clientWidth;
					canvas.height = canvas.clientHeight;

					var devicePixelRatio = window.devicePixelRatio || 1;

					var w = canvas.clientWidth, h = canvas.clientHeight;
					texture.uploadEmpty(ctx.TextureFormat.RGBA_8, w, h);
					source.uniforms['uv2_resolution'] = ctx.UniformVec2([w, h]);
				}

				//ctx.fill({color: [Math.sin(time), 0, 0, 1]});

				source.uniforms['uf_time'] = ctx.UniformFloat(time);

				ctx.rasterize(source, null, dest);

				present(time);

				requestAnimationFrame(paint);
			} catch(e) {
				console.log(e);
			}
		}

		paint();
	} catch(e) {
		console.log(e);
	}
}