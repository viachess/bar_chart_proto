// function staticBarChart() {
  // set the dimensions and margins of the graph
  const margin = { top: 30, right: 30, bottom: 70, left: 60 },
  width = 460 - margin.left - margin.right,
  height = 800 - margin.top - margin.bottom;
  
// append the svg object to the body of the page
const svg = d3
  .select("#my_dataviz")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Parse the Data
const raw = {
  data: [
    2.509, 
    2.515, 
    2.511, 
    2.520, 
    2.533],
  dataTime: [
    1661247658000, 
    1661247670000, 
    1661247684000, 
    1661247695000, 
    1661247707000]
};

const dataset = [];
let includesNegativeValues = false;
for (let i = 1; i < raw.data.length; i++) {
  const dv = raw.data[i] - raw.data[i - 1];
  if (dv < 0) { includesNegativeValues = true }
  dataset.push({
    dv,
    timestamp: raw.dataTime[i]
  });
};

// Add Y axis
const yAxis = d3
  .scaleLinear()
  .domain(d3.extent(dataset.map(d => d.dv)))
  .range([height, 0]).nice();

svg.append("g").attr("id", "y-axis").call(d3.axisLeft(yAxis));

const xTime = d3
  .scaleTime()
  .domain(d3.extent(dataset.map(d => new Date(d.timestamp))))
  .range([0, width])
  .nice()
// X axis
const x_band = d3
  .scaleBand()
  .domain(dataset.map(d => d.timestamp))
  .range([0, width])
  .padding(0.1);
// append x axis to svg
svg
  .append("g")
  .attr("transform", `translate(0, ${height})`)
  .call(d3.axisBottom(xTime).tickFormat(d3.timeFormat("%H:%M:%S")))
  .selectAll("text")
  .attr("transform", "translate(-10,0) rotate(-45)")
  .style("text-anchor", "end");

svg.append('line').attr('x2', width).attr('y2', 0).attr('transform', `translate(0,${yAxis(0)})`).attr('stroke', 'black');

// Bars
svg
  .selectAll("pressure-bar")
  .data(dataset)
  .join("rect")
  // .attr("x", (d) => xTime(new Date(d.timestamp)) - x_band.bandwidth() / 2)
  .attr("x", (d) => x_band(d.timestamp))
  .attr("y", (d) => {
    if (includesNegativeValues) {
      return Math.min(yAxis(0), yAxis(d.dv))
    }
    return yAxis(d.dv);
  })
  .attr("width", x_band.bandwidth())
  .attr("height", (d) => {
    const res = yAxis(d.dv);
    if (includesNegativeValues) {
      return Math.abs(res - yAxis(0));
    };
    return height - res;
  })
  .attr("fill", (d) => d.dv < 0 ? 'red' : "#69b3a2")
  .append('title')
  .text(d => `Разница: ${d.dv}, Время: ${new Date(d.timestamp)}`);

svg
  .append('path')
  .datum(dataset)
  .attr('fill', 'none')
  .attr("stroke", "orange")
  .attr("stroke-width", 3)
  .attr("d", d3.line()
    .x(function(d) { return xTime(new Date(d.timestamp)) })
    .y(function(d) { return yAxis(d.dv) })
    )