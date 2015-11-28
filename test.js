function start() {
	try {
	var ctx = D3.createContextOnCanvas(document.getElementById('glcanvas'));

	var buffer = ctx.createVertexBuffer().upload(new Float32Array([1,-1,1,1,-1,-1,-1,1]));

	var program = ctx.createProgram({
		vertex: 'attribute vec2 av2_vtx;varying vec2 vv2_v;void main(){vv2_v = av2_vtx;gl_Position = vec4(av2_vtx, 0., 1.);}',
		fragment: 'precision mediump float;varying vec2 vv2_v;uniform float uf_time;void main(){gl_FragColor=vec4(vv2_v,sin(uf_time),1.);}'
	});

	var starttime = Date.now();

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