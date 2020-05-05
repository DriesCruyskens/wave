import * as dat from 'dat-gui';
import { makeNoise3D } from "open-simplex-noise";
import * as paper from 'paper';
import { saveAs } from 'file-saver';
import * as _ from 'lodash';

export default class Waves {

    constructor(canvas_id) {
        /* this.shaping_functions = {
            circle: this.circle_shape,
        } */

        this.params = {
            n_lines: 260,
            n_vertices: 200,
            smoothing: 50,
            peak_height: 1,
            peak_width:8,
            paper_format: true,
            moire: false,
            straight_edges: true,
            moire_x: 3,
            moire_y: 3,
            seed: Math.random() * 2000,
            optimize4plot: false,
            //shape: this.shaping_functions.circle,
        }

        Number.prototype.map = function (in_min, in_max, out_min, out_max) {
            return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
        }

        this.gui = new dat.GUI();
        this.canvas = document.getElementById(canvas_id);
        paper.setup(this.canvas);
        this.noise3D = makeNoise3D(Date.now());

        this.center = paper.view.center;

        this.init_gui();
        this.reset();
    }

    randomize() {
        this.params.smoothing = Math.random() * 50 + 50
        this.params.peak_height = Math.random() *.1 + 1,
        this.params.peak_width = Math.random()*2 + 8,
        
        this.reset()
    }

    reset() {
        paper.project.currentStyle = {
            strokeColor: 'black',
            //fillColor: '#00000011'
        };
        
        paper.project.clear();
        this.draw();
    }

    draw() {
        if (this.params.straight_edges) {
            this.straight_edges()
            this.params.moire && this.straight_edges(this.params.moire)
        } else {
            this.noise_edges()
            this.params.moire && this.noise_edges(this.params.moire)
        }

        paper.view.draw();
    }

    noise_edges(moire) {
        let coords = this.make_joy_texture(this.params.n_lines, this.params.n_vertices);
        
        let paths = []
        let path = new paper.Path()
        coords.forEach((c, i) => {
            if (c !== null) {
                path.add(new paper.Point(
                    this.position_texture(c[0], c[1], moire)
                ))
            } else {
                path.smooth()
                paths.push(path)
                path = new paper.Path()
            }
        })
    }

    straight_edges(moire) {
        let paths = []
        let path = new paper.Path()

        const height = paper.view.bounds.height / 1.3;
        let width = paper.view.bounds.width / 1.3;

        if (this.params.paper_format) {
            width = height / 1.4142
        }
        
        const Xmargin = (paper.view.bounds.width - width) / 2
        const Ymargin = (paper.view.bounds.height - height) / 2

        let x_off = width/this.params.n_vertices
        let y_off = height/this.params.n_lines


        for (let i = 0; i < this.params.n_lines; i++) {
            let x, y
            for (let j = 0; j < this.params.n_vertices; j++) {
                if (i == 0) {
                    x = j * x_off + width/this.params.n_vertices/2 + Xmargin;
                    y = i * y_off + height/this.params.n_lines/2 + Ymargin;
                } else {
                    x = j * x_off + width/this.params.n_vertices/2 + Xmargin;
                    y = i * y_off + height/this.params.n_lines/2 + Ymargin;
                    let dist = Math.pow(this.circle_shape(x, y, width, height).map(0, this.params.peak_width, 0, 4), 3)
                    dist = Math.max(0, dist)

                    let simplex = dist * this.noise3D(x/this.params.smoothing, y/this.params.smoothing, this.params.seed)
                    y = y - simplex

                    if (moire) {
                        x += this.params.moire_x
                        y += this.params.moire_y
                    }
                    
                    path.add(new paper.Point(x, y))
                }
            }
            
            path.smooth()
            this.params.optimize4plot && i % 2 ? path.reverse() : null // reverse every other path for quicker plotting en even ink stains
            paths.push(path)
            path = new paper.Path()
        }
    }

    make_joy_texture(n_lines, n_vertices) {
        let coords = [];

        let y_range = _.range(0, 1, 1/n_lines)    
        let x_range = _.range(0, 1, 1/n_vertices)

        y_range.push(1)
        x_range.push(1)

        y_range.forEach(ry => {
            x_range.forEach(rx => {
                coords.push([rx, ry])
            })
            coords.push(null)
        })

        return coords
    }

    circle_shape(x, y, width, height) {
        let dist = this.center.getDistance(new paper.Point(x, y));

        dist = Math.pow(dist.map(0, width, this.params.peak_width, 0), this.params.peak_height);
        dist = Math.max(0, dist);
       
        return dist
    }

    position_texture(x, y, moire) {
        
        /* const height = this.canvas.height / 1.3;
        const width = height / 1.4142; */

        const height = paper.view.bounds.height / 1.3;
        let width = paper.view.bounds.width / 1.3;

        if (this.params.paper_format) {
            width = height / 1.4142
        }
        
        const x_margin = (paper.view.bounds.width - width) / 2
        const y_margin = (paper.view.bounds.height - height) / 2

        x = x * width + x_margin;
        y = y * height + y_margin;

        
        const yoffset = this.circle_shape(x, y, width, height) * this.noise3D(x/this.params.smoothing, y/this.params.smoothing, this.params.seed)
        const xoffset = 10 * this.noise3D(x/this.params.smoothing, y/this.params.smoothing, this.params.seed)
        
        

        x = x - xoffset
        y = y - yoffset * this.params.peak_height

        if (moire) {
            x += this.params.moire_x
            y += this.params.moire_y
        }
        
        return [x, y]
    }

    init_gui() {
        this.gui.add(this, 'randomize').name('Randomize');

        this.gui.add(this.params, 'paper_format').onFinishChange((value) => {
            this.params.paper_format = value;
            this.reset();
        });

        this.gui.add(this.params, 'optimize4plot').onFinishChange((value) => {
            this.params.optimize4plot = value;
            this.reset();
        });

        this.gui.add(this.params, 'moire').onFinishChange((value) => {
            this.params.moire = value;
            this.reset();
        });

        this.gui.add(this.params, 'moire_x', -5, 5).step(0.001).onFinishChange((value) => {
            this.params.moire_x = value;
            this.reset();
        });

        this.gui.add(this.params, 'moire_y', -5, 5).step(0.001).onFinishChange((value) => {
            this.params.moire_y = value;
            this.reset();
        });

        this.gui.add(this.params, 'straight_edges').onFinishChange((value) => {
            this.params.straight_edges = value;
            this.reset();
        });

        this.gui.add(this.params, 'n_lines', 10, 500).step(1).onFinishChange((value) => {
            this.params.n_lines = value;
            this.reset();
        });

        this.gui.add(this.params, 'n_vertices', 1, 500).step(1).onFinishChange((value) => {
            this.params.n_vertices = value;
            this.reset();
        });

        this.gui.add(this.params, 'smoothing', 0, 200).step(0.001).onFinishChange((value) => {
            this.params.smoothing = value;
            this.reset();
        });

        this.gui.add(this.params, 'peak_height', 0, 3).step(0.001).onFinishChange((value) => {
            this.params.peak_height = value;
            this.reset();
        });

        this.gui.add(this.params, 'peak_width', 0, 10000).step(0.001).onFinishChange((value) => {
            this.params.peak_width = value;
            this.reset();
        });

        this.gui.add(this.params, 'seed', 0, 2000).step(0.001).onFinishChange((value) => {
            this.params.seed = value;
            this.reset();
        });

        this.gui.add(this, 'exportSVG').name('Export SVG');
    }

    exportSVG() {
        var svg = paper.project.exportSVG({asString: true});
        var blob = new Blob([svg], {type: "image/svg+xml;charset=utf-8"});
        saveAs(blob, 'waves' + JSON.stringify(this.params) + '.svg');
    }
}