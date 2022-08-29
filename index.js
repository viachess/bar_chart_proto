let includesNegativeValues = false;
let onlyNegativeValues = true;

const genData = () => {
  // Parse the Data
  const raw = {
    data: [
      2.509, 
      2.515, 
      2.511, 
      2.520, 
      2.533
    ],
    dataTime: [
      1661247658000, 
      1661247670000, 
      1661247684000, 
      1661247695000, 
      1661247707000]
  };

  const fixedVal = 2.508;
  const data = [];

  for (let i = 0; i < raw.data.length; i++) {
    const dv = raw.data[i] - fixedVal;
    if (dv < 0) { includesNegativeValues = true };
    if (dv > 0) { onlyNegativeValues = false };

    data.push({
      dv,
      timestamp: raw.dataTime[i]
    });
  };
  return data;
};
const dataset = genData();

// set the dimensions and margins of the graph
const margin = { top: 30, right: 30, bottom: 70, left: 60 },
width = 800 - margin.left - margin.right,
height = 800 - margin.top - margin.bottom;

const xAxis = (g, scale) => {
  return g.attr("transform", `translate(0,${height})`)
  .call(d3.axisBottom(scale).tickFormat(d3.timeFormat("%H:%M:%S")))
  .selectAll("text")
    .attr("transform", "translate(-10,0) rotate(-45)")
    .style("text-anchor", "end")
};

// append the svg object to the body of the page
const svg = d3
  .select("#my_dataviz")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const gx = svg.append("g");
const gy = svg.append("g");

// Add Y axis
const yExtent = d3.extent(dataset.map(d => d.dv));
const yAxis = d3
  .scaleLinear()
  .domain(yExtent)
  .range([height, 0]).nice();

gy.attr("id", "y-axis").call(d3.axisLeft(yAxis));

const xTimeScale = d3
  .scaleTime()
  .domain(d3.extent(dataset.map(d => new Date(d.timestamp))))
  .range([0, width])
  .nice();

// const x_band = d3
//   .scaleBand()
//   .domain(dataset.map(d => d.timestamp))
//   .range([0, width])
//   .padding(0.1);

if (onlyNegativeValues) {
  svg.append('line').attr('x2', width).attr('y2', 0).attr('transform', `translate(0,${yAxis(yExtent[0])})`).attr('stroke', 'black');
}

// z holds a copy of the previous transform, so we can track its changes
let z = d3.zoomIdentity;
// set up the ancillary zooms and an accessor for their transforms
var extent = [
  [0, 0], 
  [width + margin.left + margin.right, height + margin.top + margin.bottom]
];

const zoomX = d3.zoom().scaleExtent([0.1, 10]).translateExtent(extent);
// const zoomY = d3.zoom().scaleExtent([0.2, 5]);
const tx = () => d3.zoomTransform(gx.node());
// const ty = () => d3.zoomTransform(gy.node());
gx.call(zoomX).attr("pointer-events", "none");
// gy.call(zoomY).attr("pointer-events", "none");

// append rectangle path clipper to limit svg path from going outside container boundaries
const lineClipRect = svg.append("defs")
  .append("clipPath")
    .attr("id", "clip")
  .append("rect")
    .attr('x', 0)
    .attr('y', 0)
    .attr("width", width)
    .attr("height", height);

function center(event, target) {
  if (event.sourceEvent) {
    const p = d3.pointers(event, target);
    return [d3.mean(p, d => d[0]), d3.mean(p, d => d[1])];
  }
  return [width / 2, height / 2];
}

const zoom = d3.zoom().on("zoom", function(e) {
  const t = e.transform;
  const k = t.k / z.k;
  const point = center(e, this);

  // is it on an axis? is the shift key pressed?
  // const doX = point[0] > x.range()[0];
  // const doY = point[1] < y.range()[0];
  // const shift = e.sourceEvent && e.sourceEvent.shiftKey;

  // if (k === 1) {
  //   // pure translation?
  //   doX && gx.call(zoomX.translateBy, (t.x - z.x) / tx().k, 0);
  //   doY && gy.call(zoomY.translateBy, 0, (t.y - z.y) / ty().k);
  // } else {
  //   // if not, we're zooming on a fixed point
  //   doX && gx.call(zoomX.scaleBy, shift ? 1 / k : k, point);
  //   doY && gy.call(zoomY.scaleBy, k, point);
  // }
  
  if (k === 1) {
    gx.call(zoomX.translateBy, (t.x - z.x) / tx().k, 0);
  } else {
    gx.call(zoomX.scaleBy, k, point);
  }

  z = t;

  redraw();
});

// const formatTime = d3.timeFormat("%d %b   %H:%M:%S");
const formatTime = d3.timeFormat("%x %-H:%M:%S.%L");
const zoomRect = svg.append('rect')
  .attr('class', 'zoom')
  .attr('fill', 'none')
  .style('pointer-events', 'all')
  .attr('x', 0)
  .attr('y', 0)
  .attr('width', width)
  .attr('height', height)
  .on("mouseover", function() { 
    focus.style("display", null); 
    showTooltipLine();
  })
  .on("mouseout", function() { 
    focus.style("display", "none"); 
    hideTooltipLine();
  });

zoomRect.call(zoom);

function redraw() {
  const xr = tx().rescaleX(xTimeScale);
  // const yr = ty().rescaleY(y);

  gx.call(xAxis, xr);
  // gy.call(yAxis, yr);
  // draw pressure line
  const line = d3.line()
  .x(function(d) { return xr(new Date(d.timestamp)) })
  .y(function(d) { return yAxis(d.dv) });

  svg
  .selectAll('path.line-trend')
  .data([dataset])
  .join('path')
  .attr('class', 'line-trend')
  .attr('fill', 'none')
  .attr("clip-path", "url(#clip)")
  .attr("stroke", "orange")
  .attr("stroke-width", 2)
  .attr("d", line);

  function mousemove(event) {
    const pointer = d3.pointer(event);
    if (pointer[0] + tooltipWidth > width) {
      d3.select('.tooltip').attr('x', -tooltipWidth - 10)
      d3.select('.tooltip-date').attr('x', -tooltipWidth)
      d3.select('.tooltip-pressure').attr('x', -tooltipWidth)
    }else {
      d3.select('.tooltip').attr('x', 10)
      d3.select('.tooltip-date').attr('x', defaultTextX)
      d3.select('.tooltip-pressure').attr('x', defaultTextX)
    };
  
    const x0 = xr.invert(pointer[0]);
    const i = bisectDate.left(dataset, x0, 1);
    console.log(i);
    const d0 = dataset[i - 1];
    const d1 = dataset[i];
    if (d0 && d1) {
      const d = x0 - d0.timestamp > d1.timestamp - x0 ? d1 : d0;
    
      focus.attr("transform", `translate(${xr(new Date(d.timestamp))}, ${yAxis(d.dv)})`);
      // too.attr("transform", `translate(${xTimeScale(new Date(d.timestamp))}, ${yAxis(d.dv)})`);
      moveTooltipLine(xr(new Date(d.timestamp)));
      focus.select(".tooltip-date").text(formatTime(new Date(d.timestamp)));
      focus.select(".tooltip-pressure").text(`Давление: ${d.dv.toFixed(6)}`);
    }
  };

  zoomRect
  .on("mousemove", null);
  zoomRect
  .on("mousemove", mousemove);
};
redraw();

const focus = svg.append("g")
.attr("class", "focus")
.style("display", "none");

const tooltipLine = svg.append('line');

function moveTooltipLine (x) {
  tooltipLine
  .attr('x1', x)
  .attr('x2', x)
  .attr('y1', 0)
  .attr('y2', height)
  .attr("style", "stroke:red; stroke-width:1; stroke-dasharray: 5 3;")
};

function showTooltipLine() {
  tooltipLine.classed('hidden', false);
}

function hideTooltipLine() {
  tooltipLine.classed('hidden', true);
}


focus.append("circle")
.attr("r", 5);

let tooltipX = 10;
const tooltipWidth = 200;

focus.append("rect")
.attr("class", "tooltip")
.attr("width", tooltipWidth)
.attr("height", '50')
.attr("x", tooltipX)
.attr("y", -22)
.attr("rx", 4)
.attr("ry", 4);

const defaultTextX = 18;

focus.append("text")
.attr("class", "tooltip-date")
.attr("x", defaultTextX)
.attr("y", -2);

focus.append("text")
.attr("class", "tooltip-pressure")
.attr("x", defaultTextX)
.attr("y", 18);

// focus.append("text")
// .attr("x", 18)
// .attr("y", 18);


const bisectDate = d3.bisector(function(d) { 
  return d.timestamp; 
});


// Bars
// svg
//   .selectAll("pressure-bar")
//   .data(dataset)
//   .join("rect")
//   // .attr("x", (d) => xTimeScale(new Date(d.timestamp)) - x_band.bandwidth() / 2)
//   .attr("x", (d) => x_band(d.timestamp))
//   .attr("y", (d) => {
//     if (includesNegativeValues) {
//       return Math.min(yAxis(0), yAxis(d.dv))
//     }
//     return yAxis(d.dv);
//   })
//   .attr("width", x_band.bandwidth())
//   .attr("height", (d) => {
//     const res = yAxis(d.dv);
//     if (includesNegativeValues) {
//       return Math.abs(res - yAxis(0));
//     };
//     return height - res;
//   })
//   .attr("fill", (d) => d.dv < 0 ? 'red' : "#69b3a2")
//   .append('title')
//   .text(d => `Разница: ${d.dv}, Время: ${new Date(d.timestamp)}`);