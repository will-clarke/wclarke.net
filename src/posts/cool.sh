#!/usr/bin/env bash

fd --type f --extension md | while read -r filename
do
    date=$(cat $filename | grep ^date: | cut -d ' ' -f 2-)
    echo $date -  $filename
    mv "$filename" "$date--$filename"
done
