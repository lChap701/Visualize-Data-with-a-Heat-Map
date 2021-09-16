const URL =
  "https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json";

// For debugging
const xhr = new XMLHttpRequest();
xhr.open("GET", URL, true);
xhr.send();
xhr.onreadystatechange = function () {
  if (this.readyState == 4) {
    console.log(this.responseText);
  }
};

// Color Pallete
const colorsRange = [0, 11];
const colors = d3
  .scaleSequential()
  .interpolator(d3.interpolateTurbo)
  .domain(colorsRange);

// Margins, width, & height
const margin = { top: 13, right: 60, bottom: 80, left: 60 };
const WIDTH = 1150 - margin.left - margin.right;
const HEIGHT = 1050 - margin.top - margin.bottom;

// Formats
const formatYr = d3.utcFormat("%Y");
const formatMon = d3.utcFormat("%B");
const formatDate = d3.utcFormat("%B, %Y");
const formatTemp = d3.format(".1f");
const formatVar = d3.format("+.1f");

// Get JSON
d3.json(URL).then((data) => {
  d3.select("#heat-map")
    .append("h2")
    .attr("id", "description")
    .text(
      data.monthlyVariance[0].year +
        " - " +
        data.monthlyVariance[data.monthlyVariance.length - 1].year +
        ": base temperature " +
        data.baseTemperature +
        "℃"
    );

  // SVG
  const svg = d3
    .select("#heat-map")
    .append("svg")
    .attr("width", WIDTH + margin.left + margin.right)
    .attr("height", HEIGHT + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Tooltip
  var tooltip = d3
    .select("#heat-map")
    .append("div")
    .style("opacity", 0)
    .attr("id", "tooltip");

  // Years, months, & variances
  const monVar = data.monthlyVariance;
  const variance = data.monthlyVariance.map((d) => d.variance);
  const yrs = monVar.map((d) => d.year);
  let mons = monVar.map((d) => d.month);
  mons = mons.filter((m, i) => mons.indexOf(m) === i);

  // For the months displayed on the y-axis
  let monKeys = [];

  for (let key in mons) {
    monKeys.push(parseInt(key));
  }

  // Scales
  const xScale = d3.scaleBand().range([0, WIDTH]).domain(yrs);

  const yScale = d3.scaleBand().range([0, HEIGHT]).domain(monKeys);

  // Ticket values
  const tickVals = xScale.domain().filter((x) => x % 10 === 0);

  // Axes
  const xAxis = d3
    .axisBottom(xScale)
    .tickValues(tickVals)
    .tickFormat(function (yr) {
      var date = new Date(0);
      date.setUTCFullYear(yr);
      return formatYr(date);
    });

  const yAxis = d3
    .axisLeft(yScale)
    .tickValues(yScale.domain())
    .tickFormat(function (mon) {
      var date = new Date(0);
      date.setUTCMonth(mon);
      return formatMon(date);
    });

  // Adds axes
  svg
    .append("g")
    .attr("id", "x-axis")
    .attr("transform", "translate(0," + HEIGHT + ")")
    .call(xAxis);

  svg.append("g").attr("id", "y-axis").call(yAxis);

  // Labels
  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "translate(" + WIDTH / 2 + "," + (HEIGHT + 40) + ")")
    .text("Year");

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "translate(-50," + HEIGHT / 2 + ") rotate(-90)")
    .text("Month");

  // Mouse event functions
  const mouseover = function (e) {
    tooltip.style("opacity", 1);
    d3.select(this).style("stroke", "#000").style("opacity", 1);
  };

  const mousemove = function (e) {
    const yr = parseInt(e.target.getAttribute("data-year"));
    const mon = parseInt(e.target.getAttribute("data-month"));

    const date = formatDate(new Date(yr, mon));

    const dataTemp = parseFloat(e.target.getAttribute("data-temp"));
    const temp = formatTemp(dataTemp);

    const dataVar = parseFloat(e.target.getAttribute("data-var"));
    const vari = formatVar(dataVar);

    var html = "<h4 id='hdg'>" + date + "</h4>";
    html += "<p>" + temp + "&#8451;</p>";
    html += "<p>" + vari + "&#8451;</p>";

    tooltip
      .html(html)
      .attr("data-year", yr)
      .style("left", e.pageX + 50 + "px")
      .style("top", e.pageY + "px");
  };

  const mouseleave = function (e) {
    tooltip.style("opacity", 0);
    d3.select(this).style("stroke", "none");
  };

  // Make values displayed properly on the y axis
  const fixedMons = monVar.map((m) => {
    m.month--;
    return m;
  });

  // Map
  svg
    .selectAll()
    .data(fixedMons)
    .enter()
    .append("rect")
    .attr("class", "cell")
    .attr("x", (d) => xScale(d.year))
    .attr("y", (d) => yScale(d.month))
    .attr("data-year", (d) => d.year)
    .attr("data-month", (d) => d.month)
    .attr("data-temp", (d) => data.baseTemperature + d.variance)
    .attr("data-var", (d) => d.variance)
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .style("fill", (d) => colors(data.baseTemperature + d.variance))
    .style("stroke-width", 1)
    .style("stroke", "none")
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave);

  // Legend
  let temp = [];

  d3.selectAll(".cell").each(function (d) {
    temp.push(parseFloat(d3.select(this).attr("data-temp")));
  });

  const MIN = d3.min(temp);
  const MAX = d3.max(temp);

  let legColors = [];

  for (let i = 0.1; i < 1; i += 0.1) {
    legColors.push(d3.interpolateTurbo(i));
  }

  const LEG_WIDTH = 400;
  const LEG_HEIGHT = 300 / (legColors.length + 1);

  var legThreshold = d3
    .scaleThreshold()
    .domain(
      (function (min, max, count) {
        var array = [];
        var step = (max - min) / count;
        var base = min;
        for (var i = 1; i < count; i++) {
          array.push(base + i * step);
        }
        return array;
      })(MIN, MAX, legColors.length + 2)
    )
    .range(legColors);

  var legScale = d3.scaleLinear().domain([MIN, MAX]).range([0, LEG_WIDTH]);
  var legAxis = d3
    .axisBottom(legScale)
    .tickValues(legThreshold.domain())
    .tickFormat(formatTemp);

  var legend = svg
    .append("g")
    .attr("id", "legend")
    .attr(
      "transform",
      "translate(" +
        (0 - margin.left) +
        "," +
        (margin.top + HEIGHT + margin.bottom - 2.5 * LEG_HEIGHT) +
        ")"
    );

  legend
    .append("g")
    .attr("transform", "translate(35," + LEG_HEIGHT + ")")
    .selectAll()
    .data(
      legThreshold.range().map(function (c) {
        var d = legThreshold.invertExtent(c);
        if (d[0] === undefined) {
          d[0] = legScale.domain()[0];
        }

        if (d[1] === undefined) {
          d[1] = legScale.domain()[1];
        }

        return d;
      })
    )
    .enter()
    .append("rect")
    .style("fill", (d) => legThreshold(d[0]))
    .style("stroke", "#000")
    .attr("x", (d) => legScale(d[0]))
    .attr("y", -margin.top - 13)
    .attr("width", (d) => legScale(d[1]) - legScale(d[0]))
    .attr("height", LEG_HEIGHT);

  legend
    .append("g")
    .attr("transform", "translate(0," + LEG_HEIGHT + ")")
    .call(legAxis);
});
