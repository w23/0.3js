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
		var ctx = D3.createContextOnCanvas(document.getElementById('glcanvas'));

		var buffer = ctx.createVertexBuffer().upload(new Float32Array([1,-1,1,1,-1,-1,-1,1]));

		var vertex_source = 'attribute vec2 av2_vtx;varying vec2 vv2_v;void main(){vv2_v = av2_vtx;gl_Position = vec4(av2_vtx, 0., 1.);}';

		var program = ctx.createProgram({
			vertex: vertex_source,
			fragment: editor.getValue()
		});

		editor.getSession().on('change', function(e) {
			try {
				program = ctx.createProgram({
					vertex: vertex_source,
					fragment: editor.getValue()
				});
			} catch (except) {
				console.log(except);
			}
		});

		var starttime = Date.now();

		resize = function () {
		}

		paint = function paint() {
			requestAnimationFrame(paint);

			var time = (Date.now() - starttime) * 0.001;

			ctx.fill({color: [Math.sin(time), 0, 0, 1]});

			ctx.paint({
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
					'uf_time': time
				},
				mode: ctx.Primitive.TriangleStrip,
				count: 4
			});
		}

		paint();
	} catch(e) {
		console.log(e);
	}
}