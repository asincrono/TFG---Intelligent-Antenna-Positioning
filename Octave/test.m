function idx = test(list,str)
   idx = 0;
   for i = 1:rows(list)
      if strcmp(list(i,:),str)
         idx = i;
         return;
      endif
   endfor
endfunction

