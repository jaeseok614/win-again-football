(function(root){
 'use strict';
 const clubs={
  1:['Arsenal','Aston Villa','AFC Bournemouth','Brentford','Brighton & Hove Albion','Chelsea','Coventry City','Crystal Palace','Everton','Fulham','Hull City','Ipswich Town','Leeds United','Liverpool','Manchester City','Manchester United','Newcastle United','Nottingham Forest','Sunderland','Tottenham Hotspur'],
  2:['Birmingham City','Blackburn Rovers','Bolton Wanderers','Bristol City','Burnley','Cardiff City','Charlton Athletic','Derby County','Lincoln City','Middlesbrough','Millwall','Norwich City','Portsmouth','Preston North End','Queens Park Rangers','Sheffield United','Southampton','Stoke City','Swansea City','Watford','West Bromwich Albion','West Ham United','Wolverhampton Wanderers','Wrexham'],
  3:['AFC Wimbledon','Barnsley','Blackpool','Bradford City','Bromley','Burton Albion','Cambridge United','Doncaster Rovers','Huddersfield Town','Leicester City','Leyton Orient','Luton Town','Mansfield Town','Milton Keynes Dons','Notts County','Oxford United','Peterborough United','Plymouth Argyle','Reading','Sheffield Wednesday','Stevenage','Stockport County','Wycombe Wanderers','Wigan Athletic'],
  4:['Accrington Stanley','Barnet','Bristol Rovers','Cheltenham Town','Chesterfield','Colchester United','Crawley Town','Crewe Alexandra','Exeter City','Fleetwood Town','Gillingham','Grimsby Town','Newport County','Northampton Town','Oldham Athletic','Port Vale','Rochdale','Rotherham United','Salford City','Shrewsbury Town','Swindon Town','Tranmere Rovers','Walsall','York City'],
  5:['AFC Fylde','Aldershot Town','Altrincham','Barrow','Boreham Wood','Boston United','Carlisle United','Eastleigh','FC Halifax Town','Forest Green Rovers','Gateshead','Harrogate Town','Hartlepool United','Hornchurch','Kidderminster Harriers','Scunthorpe United','Solihull Moors','Southend United','Sutton United','Tamworth','Wealdstone','Woking','Worthing','Yeovil Town']
 };
 const api={clubs:Object.freeze(Object.fromEntries(Object.entries(clubs).map(([division,rows])=>[division,Object.freeze(rows)])))};
 root.EnglishPyramid=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
