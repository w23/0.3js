'use strict';

var self = {}

function init() {
	self.ctx = DotThree.createContextOnCanvas(document.getElementById("canvas"));
	/*
	self.buffer = self.ctx.createVertexBuffer().upload(new Float32Array([1,-1,1,1,-1,-1,-1,1]));
	self.program = self.ctx.createProgram({
		vertex: 'attribute vec2 av2_vtx;varying vec2 vv2_v;void main(){vv2_v = av2_vtx; gl_Position = vec4(av2_vtx, 0., 1.);}',
		fragment: 'precision mediump float;varying vec2 vv2_v;unform float time;void main(){gl_FragColor=vec4(vv2_v,.5+.5*sin(time),1.);}'
	});
	*/
} // function init()

function paint() {
	requestAnimationFrame(paint);

	var time = Date.now() * 0.001;

	self.ctx.fill({color: [1,Math.sin(time),0,1]});

/*
	self.ctx.paint({
		source: {
			primitive: self.ctx.Primitive.TRIANGLE_STRIP,
			vertices: 4,
			attributes: {
				'av2_vtx': {
					buffer: self.buffer,
					size: 2,
					type: self.ctx.AttribType.FLOAT32,
					offset: 0
				} // 'av2_vtx':
			}, // attributes:
			uniforms: {
				'time': new self.ctx.UniformFloat(time)
			}
		}, // source:
		operation: {
			program: self.program
		}
	}); // self.ctx.paint
*/
} // function paint()

try {
	init();
	paint();
} catch(e) {
	console.log(e);
}

