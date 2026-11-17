# Usage: Rscript run_idtaxa.R <split_dir>   -> writes <split_dir>/pred_idtaxa.tsv
# Reference headers in ref_idtaxa.fasta are ">id Root;rank1;...;genus;" (DECIPHER's format;
# double-check against the DECIPHER vignette for your installed version).
suppressMessages(library(DECIPHER))
d <- commandArgs(trailingOnly = TRUE)[1]
ref <- readDNAStringSet(file.path(d, "ref_idtaxa.fasta"))
tax <- sub("^\\S+ ", "", names(ref))
trainingSet <- LearnTaxa(ref, tax)
q <- readDNAStringSet(file.path(d, "query.fasta"))
ids <- IdTaxa(q, trainingSet, strand = "top", threshold = 0, processors = NULL)
out <- vapply(seq_along(ids), function(i) {
  x <- ids[[i]]; tx <- x$taxon[-1]; cf <- x$confidence[-1] / 100   # drop "Root"; % -> [0,1]
  s <- which(grepl("^unclassified", tx))[1]
  if (!is.na(s)) { tx <- tx[seq_len(s - 1)]; cf <- cf[seq_len(s - 1)] }
  paste(names(q)[i], paste(tx, collapse = ";"), paste(sprintf("%.3f", cf), collapse = ";"), sep = "\t")
}, character(1))
writeLines(c("id\tlineage\tconf", out), file.path(d, "pred_idtaxa.tsv"))
