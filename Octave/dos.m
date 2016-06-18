close all;
clear all;

pathBase = '~/Google Drive/TFG - Guiado inteligente de antenas/data';
pathLocation2 = '/loc2';

path = strcat(pathBase, pathLocation2);

cd (path);

filesDev0 = ls ('I*')
filesDev1 = ls ('dev2*');

for i = 1:rows(filesDev0) 
   fileName = filesDev0(i,:);
   xTextDev0{i} = fileName;
   wifiDataDev0(i).fileName = fileName;
   wifiDataDev0(i).data = load(fileName);
   numRows = rows(wifiDataDev0(i).data);
   wifiDataDev0(i).avgSpeed = sum(wifiDataDev0(i).data(:,4)) / numRows;
   wifiDataDev0(i).avgLink  = sum(wifiDataDev0(i).data(:,2)) / numRows;
   wifiDataDev0(i).avgLevel = sum(wifiDataDev0(i).data(:,3)) / numRows;
endfor

#Gráfico para la vieja tarjeta Alfa AWUS036AC.
%figure(1);
%hold on;
%for i = 1:columns(wifiDataDev0)
%   i
%   pSpeed = plot(i, wifiDataDev0(i).avgSpeed, 'og');
%   pLink  = plot(i, wifiDataDev0(i).avgLink * 400, 'xr');
%   pLevel = plot(i, wifiDataDev0(i).avgLevel * 400, '*r');
%endfor
figure(1);
hold on;

x = 2:2:(2*columns(wifiDataDev0));

avgSpeed = [wifiDataDev0(:).avgSpeed];

avgLink  = [wifiDataDev0(:).avgLink] * 400;

avgLevel = [wifiDataDev0(:).avgLevel] * 400;



pSpeed = plot(x, avgSpeed, 'og');
avgLink
pLink  = plot(x, avgLink,'xr');
avgLevel
pLevel = plot(x, avgLevel, '*k');

title ('Alfa AWUS036AC wifi adapter.');

set(gca, 'XTickLabel', xTextDev0); 

xlabel ('Antenna arrangement');
ylabel ('Kbps (for speed)');

l1 = legend(pSpeed, 'Speed avg.');
l2 = legend(pLink, 'Link avg. (x400)');
l3 = legend(pLevel, 'Level avg. (x400)'); 


set (l1, 'fontsize', 16')
set (l2, 'fontsize', 16')
set (l3, 'fontsize', 16')
hold off;

for i = 1:rows(filesDev1) 
   fileName = filesDev1(i,:);
   xTextDev1{i} = fileName;
   wifiDataDev1(i).fileName = fileName;
   wifiDataDev1(i).data = load(fileName);
   numRows = rows(wifiDataDev1(i).data);
   wifiDataDev1(i).avgSpeed = sum(wifiDataDev1(i).data(:,4)) / numRows;
   wifiDataDev1(i).avgLink  = sum(wifiDataDev1(i).data(:,2)) / numRows;
   wifiDataDev1(i).avgLevel = sum(wifiDataDev1(i).data(:,3)) / numRows;
endfor



# Gráfico para la nueva tarjeta Asus USB-N14.
%figure(2);
%hold on;
%for i = 1:columns(wifiDataDev0)
%   i
%   pSpeed = plot(i, wifiDataDev1(i).avgSpeed, 'og');
%   pLink  = plot(i, wifiDataDev1(i).avgLink * 200, 'xr');
%   pLevel = plot(i, wifiDataDev1(i).avgLevel * 200, '*r');
%endfor

figure(2);
hold on;

x = 2:2:(2*columns(wifiDataDev1))

avgSpeed = [wifiDataDev1(:).avgSpeed];
avgLink  = [wifiDataDev1(:).avgLink] * 200;
avgLevel = [wifiDataDev1(:).avgLevel] * (-200);

pSpeed = plot(x, avgSpeed, 'og');
pLink  = plot(x, avgLink,'*r');
pLevel = plot(x, avgLevel, 'xr');

title('Asus USB-N14 wifi adapter.');

set(gca, 'XTickLabel', xTextDev1); 

xlabel ('Antenna arrangement');
ylabel ('Kbps (for speed)');



l1 = legend(pSpeed, 'Speed avg.');
l2 = legend(pLink, 'Link avg. (x200)');
l3 = legend(pLevel, 'Level avg. (x(-200))'); 


set (l1, 'fontsize', 16')
set (l2, 'fontsize', 16')
set (l3, 'fontsize', 16')
hold off;



# Gráfico speed/link/level para Alfa.
figure(3);

title('speed vs. link & level - Alfa');
hold on;

nRows = rows(wifiDataDev0(1).data);

x = 2:2:2*nRows;

speed =  wifiDataDev0(1).data(:,4)';
link = wifiDataDev0(1).data(:,2)';
level =  wifiDataDev0(1).data(:,3)';
pSpeed = plot(x, speed, 'b-');
pLink  = plot(x, link * 200, 'r-');
pLevel = plot(x, level * 500, 'k-');

xlabel('Time in seconds');
ylabel('Kbps');

l1 = legend(pSpeed, 'Speed');
l2 = legend(pLink, 'Link (x200)');
l3 = legend(pLevel, 'Level (x500)');

set (l1, 'fontsize', 14')
set (l2, 'fontsize', 14')
set (l3, 'fontsize', 14')

hold off
# Gráfico speed/link/level para Asus.
figure(4);
title('speed vs. link & level - Asus');
hold on;
nRows = rows(wifiDataDev1(1).data);

if mod(nRows, 2) != 0
   nRows -= 1;
endif 

x = 2:2:2*nRows;

speed = wifiDataDev1(1).data(:,4)';
link = wifiDataDev1(1).data(:,2)';
level = wifiDataDev1(1).data(:,3)';
pSpeed = plot(x, speed, 'b-');
pLink  = plot(x, link * 200, 'r-');
pLevel = plot(x, level * (-200), 'k-');

xlabel('Time in seconds');
ylabel('Kbps');

l1 = legend(pSpeed, 'Speed');
l2 = legend(pLink, 'Link (x200)');
l3 = legend(pLevel, 'Level (x(-200))');

set (l1, 'fontsize', 14')
set (l2, 'fontsize', 14')
set (l3, 'fontsize', 14')

hold off